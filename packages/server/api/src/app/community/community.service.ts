import { apId, PlatformRole } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { repoFactory } from '../core/db/repo-factory'
import { userRepo } from '../user/user-service'
import { CommunityChannelEntity, CommunityChannelRow } from './community-channel.entity'
import { CommunityMessageEntity, CommunityMessageRow } from './community-message.entity'

const channelRepo = repoFactory(CommunityChannelEntity)
const messageRepo = repoFactory(CommunityMessageEntity)

export const communityService = (_log: FastifyBaseLogger) => ({

    async listChannels(platformId: string): Promise<CommunityChannelRow[]> {
        const channels = await channelRepo().find({
            where: { platformId, isDirectMessage: false },
            order: { created: 'ASC' },
        })

        return channels
    },

    async createChannel(params: {
        platformId: string
        name: string
        description: string
        category: 'CHANNELS' | 'DIRECT MESSAGES'
    }): Promise<CommunityChannelRow> {
        const channel = channelRepo().create({
            id: apId(),
            platformId: params.platformId,
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
        const existing = await channelRepo().findOneBy({ id: params.id, platformId: params.platformId })
        if (!existing) return null
        if (params.name) existing.name = params.name.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
        if (params.description !== undefined) existing.description = params.description
        return channelRepo().save(existing)
    },

    async deleteChannel(id: string, platformId: string): Promise<boolean> {
        const result = await channelRepo().delete({ id, platformId })
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
            platformId: params.platformId,
            dmPair: pair,
        })
        if (existing) return existing

        const channel = channelRepo().create({
            id: apId(),
            platformId: params.platformId,
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
            .where('c.platformId = :platformId', { platformId })
            .andWhere('c.isDirectMessage = true')
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

    async deleteMessage(messageId: string, senderId: string, platformId: string): Promise<boolean> {
        const msg = await messageRepo()
            .createQueryBuilder('m')
            .innerJoin('community_channel', 'c', 'c.id = m.channelId AND c.platformId = :platformId', { platformId })
            .where('m.id = :messageId', { messageId })
            .andWhere('m.senderId = :senderId', { senderId })
            .getOne()
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
        const { messageId, emoji, userId, platformId } = params
        const msg = await messageRepo()
            .createQueryBuilder('m')
            .innerJoin('community_channel', 'c', 'c.id = m.channelId AND c.platformId = :platformId', { platformId })
            .where('m.id = :id', { id: messageId })
            .getOne()
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
    async listMembers(platformId: string) {
        const users = await userRepo().find({
            where: { platformId },
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
