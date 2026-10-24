import { apId, PlatformRole } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { repoFactory } from '../core/db/repo-factory'
import { userRepo } from '../user/user-service'
import { CommunityChannelEntity, CommunityChannelRow } from './community-channel.entity'
import { CommunityMessageEntity, CommunityMessageRow } from './community-message.entity'
import { CommunityHubEntity, CommunityHubRow } from './community-hub.entity'
import { CommunityHubMemberEntity, CommunityHubMemberRow } from './community-hub-member.entity'

const channelRepo = repoFactory(CommunityChannelEntity)
const messageRepo = repoFactory(CommunityMessageEntity)
const hubRepo = repoFactory(CommunityHubEntity)
const hubMemberRepo = repoFactory(CommunityHubMemberEntity)

export const messagesService = (_log: FastifyBaseLogger) => ({

    // ── Hubs (Discord Servers) ──────────────────────────────────────────
    async listHubsForUser(userId: string): Promise<Array<CommunityHubRow & { membersCount: number; role: string }>> {
        // Find all memberships for this user
        const memberships = await hubMemberRepo().find({
            where: { userId },
            order: { created: 'ASC' },
        })

        const hubIds = memberships.map(m => m.hubId)
        if (hubIds.length === 0) {
            // Auto-seed or return default community hub if user has none
            return []
        }

        const hubs = await hubRepo().createQueryBuilder('h')
            .where('h.id IN (:...hubIds)', { hubIds })
            .orderBy('h.created', 'ASC')
            .getMany()

        // Get members count for each hub
        const memberCounts = await hubMemberRepo().createQueryBuilder('m')
            .select('m.hubId', 'hubId')
            .addSelect('COUNT(m.id)', 'count')
            .where('m.hubId IN (:...hubIds)', { hubIds })
            .groupBy('m.hubId')
            .getRawMany()

        const countMap = new Map<string, number>()
        for (const row of memberCounts) {
            countMap.set(row.hubId, parseInt(row.count, 10) || 1)
        }

        const membershipMap = new Map<string, string>()
        for (const m of memberships) {
            membershipMap.set(m.hubId, m.role)
        }

        return hubs.map(h => ({
            ...h,
            membersCount: countMap.get(h.id) ?? 1,
            role: membershipMap.get(h.id) ?? 'member',
        }))
    },

    async createHub(params: {
        ownerId: string
        name: string
        description?: string
        color?: string
        icon?: string
        platformId: string
    }): Promise<CommunityHubRow & { membersCount: number; role: string }> {
        const inviteCode = apId().slice(0, 10).toLowerCase()
        const hub = hubRepo().create({
            id: apId(),
            ownerId: params.ownerId,
            name: params.name.trim(),
            description: params.description ?? null,
            icon: params.icon ?? null,
            color: params.color ?? 'bg-indigo-600',
            inviteCode,
            isPublic: true,
        })
        const savedHub = await hubRepo().save(hub)

        // Add creator as owner member
        const member = hubMemberRepo().create({
            id: apId(),
            hubId: savedHub.id,
            userId: params.ownerId,
            role: 'owner',
        })
        await hubMemberRepo().save(member)

        // Create default general channel for this hub
        const defaultChannel = channelRepo().create({
            id: apId(),
            platformId: params.platformId,
            hubId: savedHub.id,
            name: 'general',
            description: 'Saluran obrolan umum',
            category: 'CHANNELS',
            isDirectMessage: false,
            dmPair: null,
        })
        await channelRepo().save(defaultChannel)

        return {
            ...savedHub,
            membersCount: 1,
            role: 'owner',
        }
    },

    async updateHub(params: {
        id: string
        userId: string
        name?: string
        description?: string
        color?: string
        icon?: string
    }): Promise<CommunityHubRow | null> {
        const member = await hubMemberRepo().findOneBy({ hubId: params.id, userId: params.userId })
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            return null
        }

        const existing = await hubRepo().findOneBy({ id: params.id })
        if (!existing) return null

        if (params.name) existing.name = params.name.trim()
        if (params.description !== undefined) existing.description = params.description
        if (params.color !== undefined) existing.color = params.color
        if (params.icon !== undefined) existing.icon = params.icon

        return hubRepo().save(existing)
    },

    async deleteHub(params: { id: string; userId: string }): Promise<boolean> {
        const member = await hubMemberRepo().findOneBy({ hubId: params.id, userId: params.userId })
        if (!member || member.role !== 'owner') {
            return false
        }

        // Delete channels and members belonging to this hub
        await channelRepo().delete({ hubId: params.id })
        await hubMemberRepo().delete({ hubId: params.id })
        const result = await hubRepo().delete({ id: params.id })
        return (result.affected ?? 0) > 0
    },

    async getHubByInviteCode(inviteCode: string): Promise<(CommunityHubRow & { membersCount: number }) | null> {
        const hub = await hubRepo().findOneBy({ inviteCode: inviteCode.trim().toLowerCase() })
        if (!hub) return null

        const count = await hubMemberRepo().countBy({ hubId: hub.id })
        return {
            ...hub,
            membersCount: count || 1,
        }
    },

    async joinHubByInviteCode(params: {
        inviteCode: string
        userId: string
    }): Promise<(CommunityHubRow & { membersCount: number; role: string }) | null> {
        const hub = await hubRepo().findOneBy({ inviteCode: params.inviteCode.trim().toLowerCase() })
        if (!hub) return null

        let member = await hubMemberRepo().findOneBy({ hubId: hub.id, userId: params.userId })
        if (!member) {
            member = hubMemberRepo().create({
                id: apId(),
                hubId: hub.id,
                userId: params.userId,
                role: 'member',
            })
            await hubMemberRepo().save(member)
        }

        const count = await hubMemberRepo().countBy({ hubId: hub.id })
        return {
            ...hub,
            membersCount: count || 1,
            role: member.role,
        }
    },

    // ── Channels ──────────────────────────────────────────────────────────
    async listChannels(platformId: string, hubId?: string): Promise<CommunityChannelRow[]> {
        const qb = channelRepo().createQueryBuilder('c')
            .where('c.isDirectMessage = false')

        if (hubId && hubId !== 'anticeil') {
            qb.andWhere('c.hubId = :hubId', { hubId })
        } else {
            // Home / Anticeil default channels
            qb.andWhere('(c.hubId IS NULL OR c.hubId = :anticeilId)', { anticeilId: 'anticeil' })
        }

        qb.orderBy('c.created', 'ASC')
        return qb.getMany()
    },

    async createChannel(params: {
        platformId: string
        hubId?: string | null
        name: string
        description: string
        category: 'CHANNELS' | 'DIRECT MESSAGES'
    }): Promise<CommunityChannelRow> {
        const channel = channelRepo().create({
            id: apId(),
            platformId: params.platformId,
            hubId: params.hubId ?? null,
            name: params.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
            description: params.description,
            category: params.category,
            isDirectMessage: false,
            dmPair: null,
        })
        return channelRepo().save(channel)
    },

    async updateChannel(params: {
        id: string
        platformId: string
        name?: string
        description?: string
    }): Promise<CommunityChannelRow | null> {
        const existing = await channelRepo().findOneBy({ id: params.id })
        if (!existing) return null
        if (params.name) existing.name = params.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
        if (params.description !== undefined) existing.description = params.description
        return channelRepo().save(existing)
    },

    async deleteChannel(id: string, platformId: string): Promise<boolean> {
        const result = await channelRepo().delete({ id })
        return (result.affected ?? 0) > 0
    },

    // ── Direct Messages ──────────────────────────────────────────────────
    async getOrCreateDm(params: {
        platformId: string
        userId1: string
        userId2: string
    }): Promise<CommunityChannelRow> {
        const pair = [params.userId1, params.userId2].sort().join(':')
        const existing = await channelRepo().findOneBy({
            dmPair: pair,
        })
        if (existing) return existing

        const channel = channelRepo().create({
            id: apId(),
            platformId: params.platformId,
            hubId: null,
            name: `dm-${pair}`,
            description: '',
            category: 'DIRECT MESSAGES',
            isDirectMessage: true,
            dmPair: pair,
        })
        return channelRepo().save(channel)
    },

    async listDmChannelsForUser(platformId: string, userId: string): Promise<CommunityChannelRow[]> {
        return channelRepo()
            .createQueryBuilder('c')
            .where('c.isDirectMessage = true')
            .andWhere('c.dmPair LIKE :pattern', { pattern: `%${userId}%` })
            .orderBy('c.updated', 'DESC')
            .getMany()
    },

    // ── Messages ──────────────────────────────────────────────────────────
    async listMessages(channelId: string, limit = 100): Promise<CommunityMessageRow[]> {
        return messageRepo().find({
            where: { channelId },
            order: { created: 'ASC' },
            take: limit,
        })
    },

    async sendMessage(params: {
        channelId: string
        senderId: string
        senderName: string
        senderEmail: string
        senderAvatar: string | null
        senderRole: string
        content: string
        attachments?: object | null
    }): Promise<CommunityMessageRow> {
        const msg = messageRepo().create({
            id: apId(),
            channelId: params.channelId,
            senderId: params.senderId,
            senderName: params.senderName,
            senderEmail: params.senderEmail,
            senderAvatar: params.senderAvatar ?? null,
            senderRole: params.senderRole,
            content: params.content,
            attachments: params.attachments ?? null,
            reactions: {},
        })
        return messageRepo().save(msg)
    },

    async deleteMessage(messageId: string, senderId: string, _platformId: string): Promise<boolean> {
        const msg = await messageRepo().findOneBy({ id: messageId, senderId })
        if (!msg) return false
        await messageRepo().delete({ id: messageId })
        return true
    },

    async toggleReaction(params: {
        messageId: string
        emoji: string
        userId: string
        platformId: string
    }): Promise<CommunityMessageRow | null> {
        const { messageId, emoji, userId } = params
        const msg = await messageRepo().findOneBy({ id: messageId })
        if (!msg) return null

        const reactions = (msg.reactions ?? {}) as Record<string, string[]>
        const users: string[] = reactions[emoji] ?? []
        const idx = users.indexOf(userId)
        if (idx === -1) {
            users.push(userId)
        } else {
            users.splice(idx, 1)
        }
        if (users.length === 0) {
            delete reactions[emoji]
        } else {
            reactions[emoji] = users
        }
        msg.reactions = reactions
        return messageRepo().save(msg)
    },

    // ── Members (query real users joined with user_identity) ─────────────
    async listMembers(_platformId: string, hubId?: string) {
        if (hubId && hubId !== 'anticeil') {
            // Fetch users that belong to this specific hub
            const hubMembers = await hubMemberRepo().find({
                where: { hubId },
            })
            const userIds = hubMembers.map(m => m.userId)
            if (userIds.length === 0) return []

            const users = await userRepo().createQueryBuilder('u')
                .leftJoinAndSelect('u.identity', 'identity')
                .where('u.id IN (:...userIds)', { userIds })
                .take(200)
                .getMany()

            const roleMap = new Map(hubMembers.map(m => [m.userId, m.role]))

            return users.map((u) => {
                const firstName = u.identity?.firstName ?? ''
                const lastName = u.identity?.lastName ?? ''
                const fullName = `${firstName} ${lastName}`.trim()
                const hubRole = roleMap.get(u.id) ?? 'member'
                return {
                    id: u.id,
                    name: fullName || u.identity?.email || 'User',
                    email: u.identity?.email ?? '',
                    avatar: u.identity?.imageUrl ?? null,
                    role: hubRole === 'owner' || hubRole === 'admin' ? ('admin' as const) : ('member' as const),
                    status: 'online' as const,
                }
            })
        }

        // Global / platform users
        const users = await userRepo().find({
            relations: { identity: true },
            take: 200,
        })

        return users.map((u) => {
            const firstName = u.identity?.firstName ?? ''
            const lastName = u.identity?.lastName ?? ''
            const fullName = `${firstName} ${lastName}`.trim()
            return {
                id: u.id,
                name: fullName || u.identity?.email || 'User',
                email: u.identity?.email ?? '',
                avatar: u.identity?.imageUrl ?? null,
                role: u.platformRole === PlatformRole.ADMIN ? ('admin' as const) : ('member' as const),
                status: 'online' as const,
            }
        })
    },
})

export const communityService = messagesService
