import { PrincipalType } from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { securityAccess } from '../core/security/authorization/fastify-security'
import { messagesService } from './messages.service'

const COMMUNITY_PRINCIPALS = [PrincipalType.USER] as const

const communitySecurity = {
    security: securityAccess.publicPlatform(COMMUNITY_PRINCIPALS),
}

export const messagesController: FastifyPluginAsyncZod = async (fastify) => {

    // ── Hubs (Discord Servers) ──────────────────────────────────────────

    // GET /v1/community/hubs — list all servers the user belongs to
    fastify.get('/hubs', {
        config: communitySecurity,
        schema: { tags: ['community'] },
    }, async (request, reply) => {
        const hubs = await messagesService(request.log).listHubsForUser(request.principal.id)
        return reply.send(hubs)
    })

    // POST /v1/community/hubs — create a new server
    fastify.post('/hubs', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            body: z.object({
                name: z.string().min(1).max(80),
                description: z.string().max(300).optional(),
                color: z.string().optional(),
                icon: z.string().optional(),
            }),
        },
    }, async (request, reply) => {
        const hub = await messagesService(request.log).createHub({
            ownerId: request.principal.id,
            platformId: request.principal.platform.id,
            name: request.body.name,
            description: request.body.description,
            color: request.body.color,
            icon: request.body.icon,
        })
        return reply.status(StatusCodes.CREATED).send(hub)
    })

    // PUT /v1/community/hubs/:id — update server name/color/description
    fastify.put('/hubs/:id', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ id: z.string() }),
            body: z.object({
                name: z.string().min(1).max(80).optional(),
                description: z.string().max(300).optional(),
                color: z.string().optional(),
                icon: z.string().optional(),
            }),
        },
    }, async (request, reply) => {
        const updated = await messagesService(request.log).updateHub({
            id: request.params.id,
            userId: request.principal.id,
            ...request.body,
        })
        if (!updated) return reply.status(StatusCodes.FORBIDDEN).send({ message: 'Forbidden or Hub not found' })
        return reply.send(updated)
    })

    // DELETE /v1/community/hubs/:id — delete server (owner only)
    fastify.delete('/hubs/:id', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ id: z.string() }),
        },
    }, async (request, reply) => {
        const deleted = await messagesService(request.log).deleteHub({
            id: request.params.id,
            userId: request.principal.id,
        })
        if (!deleted) return reply.status(StatusCodes.FORBIDDEN).send({ message: 'Only server owner can delete' })
        return reply.send({ success: true, id: request.params.id })
    })

    // GET /v1/community/invite/:inviteCode — preview server invite
    fastify.get('/invite/:inviteCode', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ inviteCode: z.string() }),
        },
    }, async (request, reply) => {
        const hub = await messagesService(request.log).getHubByInviteCode(request.params.inviteCode)
        if (!hub) return reply.status(StatusCodes.NOT_FOUND).send({ message: 'Invite code invalid or expired' })
        return reply.send(hub)
    })

    // POST /v1/community/invite/:inviteCode/join — join server via invite code
    fastify.post('/invite/:inviteCode/join', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ inviteCode: z.string() }),
        },
    }, async (request, reply) => {
        const hub = await messagesService(request.log).joinHubByInviteCode({
            inviteCode: request.params.inviteCode,
            userId: request.principal.id,
        })
        if (!hub) return reply.status(StatusCodes.NOT_FOUND).send({ message: 'Invite code invalid' })
        return reply.send(hub)
    })

    // POST /v1/community/hubs/:id/invite-user — invite/add a member by username
    fastify.post('/hubs/:id/invite-user', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ id: z.string() }),
            body: z.object({ username: z.string().min(1) }),
        },
    }, async (request, reply) => {
        const result = await messagesService(request.log).inviteMemberByUsername(
            request.params.id,
            request.body.username,
        )
        return reply.send(result)
    })

    // ── Channels ──────────────────────────────────────────────────────────

    // GET /v1/community/channels
    fastify.get('/channels', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            querystring: z.object({ hubId: z.string().optional() }),
        },
    }, async (request, reply) => {
        const channels = await messagesService(request.log).listChannels(
            request.principal.platform.id,
            request.query.hubId,
        )
        return reply.send(channels)
    })

    // POST /v1/community/channels
    fastify.post('/channels', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            body: z.object({
                name: z.string().min(1).max(80),
                description: z.string().max(300).default(''),
                category: z.enum(['CHANNELS', 'DIRECT MESSAGES']).default('CHANNELS'),
                hubId: z.string().optional(),
                type: z.enum(['text', 'voice', 'forum']).optional(),
                isPrivate: z.boolean().optional(),
            }),
        },
    }, async (request, reply) => {
        const channel = await messagesService(request.log).createChannel({
            platformId: request.principal.platform.id,
            hubId: request.body.hubId,
            name: request.body.name,
            description: request.body.description,
            category: request.body.category,
            type: request.body.type,
            isPrivate: request.body.isPrivate,
        })
        return reply.status(StatusCodes.CREATED).send(channel)
    })

    // PUT /v1/community/channels/:id
    fastify.put('/channels/:id', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ id: z.string() }),
            body: z.object({
                name: z.string().min(1).max(80).optional(),
                description: z.string().max(300).optional(),
                type: z.enum(['text', 'voice', 'forum']).optional(),
                isPrivate: z.boolean().optional(),
            }),
        },
    }, async (request, reply) => {
        const updated = await messagesService(request.log).updateChannel({
            id: request.params.id,
            platformId: request.principal.platform.id,
            ...request.body,
        })
        if (!updated) return reply.status(StatusCodes.NOT_FOUND).send({ message: 'Channel not found' })
        return reply.send(updated)
    })

    // DELETE /v1/community/channels/:id
    fastify.delete('/channels/:id', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ id: z.string() }),
        },
    }, async (request, reply) => {
        const deleted = await messagesService(request.log).deleteChannel(
            request.params.id,
            request.principal.platform.id,
        )
        return reply.send({ success: deleted, id: request.params.id })
    })

    // ── Messages ──────────────────────────────────────────────────────────

    // GET /v1/community/channels/:channelId/messages
    fastify.get('/channels/:channelId/messages', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ channelId: z.string() }),
            querystring: z.object({ limit: z.coerce.number().min(1).max(200).default(100) }),
        },
    }, async (request, reply) => {
        const messages = await messagesService(request.log).listMessages(
            request.params.channelId,
            request.query.limit,
        )
        return reply.send(messages)
    })

    // POST /v1/community/channels/:channelId/messages
    fastify.post('/channels/:channelId/messages', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ channelId: z.string() }),
            body: z.object({
                content: z.string().min(1).max(4000),
                senderName: z.string().optional(),
                senderAvatar: z.string().nullable().optional(),
                senderRole: z.string().optional(),
                attachments: z.record(z.string(), z.unknown()).nullable().optional(),
            }),
        },
    }, async (request, reply) => {
        const msg = await messagesService(request.log).sendMessage({
            channelId: request.params.channelId,
            senderId: request.principal.id,
            senderName: request.body.senderName || 'Anonymous',
            senderEmail: '',
            senderAvatar: request.body.senderAvatar ?? null,
            senderRole: request.body.senderRole || 'member',
            content: request.body.content,
            attachments: request.body.attachments ?? null,
        })
        return reply.status(StatusCodes.CREATED).send(msg)
    })

    // DELETE /v1/community/messages/:messageId
    fastify.delete('/messages/:messageId', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ messageId: z.string() }),
        },
    }, async (request, reply) => {
        const deleted = await messagesService(request.log).deleteMessage(
            request.params.messageId,
            request.principal.id,
            request.principal.platform.id,
        )
        return reply.send({ success: deleted, id: request.params.messageId })
    })

    // POST /v1/community/messages/:messageId/reactions
    fastify.post('/messages/:messageId/reactions', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ messageId: z.string() }),
            body: z.object({
                emoji: z.string().min(1).max(10),
                userId: z.string().optional(),
            }),
        },
    }, async (request, reply) => {
        const uid = request.body.userId || request.principal.id
        const updated = await messagesService(request.log).toggleReaction({
            messageId: request.params.messageId,
            emoji: request.body.emoji,
            userId: uid,
            platformId: request.principal.platform.id,
        })
        return reply.send(updated)
    })

    // ── Pinned Messages ──────────────────────────────────────────────────

    // GET /v1/community/channels/:channelId/pins
    fastify.get('/channels/:channelId/pins', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ channelId: z.string() }),
        },
    }, async (request, reply) => {
        const pins = await messagesService(request.log).listPinnedMessages(request.params.channelId)
        return reply.send(pins)
    })

    // POST /v1/community/messages/:messageId/pin
    fastify.post('/messages/:messageId/pin', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ messageId: z.string() }),
            body: z.object({
                userName: z.string().optional(),
            }).optional(),
        },
    }, async (request, reply) => {
        const updated = await messagesService(request.log).togglePinMessage({
            messageId: request.params.messageId,
            userId: request.principal.id,
            userName: request.body?.userName,
        })
        if (!updated) return reply.status(StatusCodes.NOT_FOUND).send({ message: 'Message not found' })
        return reply.send(updated)
    })

    // ── Channel Notifications ─────────────────────────────────────────────

    // GET /v1/community/channels/:channelId/notifications
    fastify.get('/channels/:channelId/notifications', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ channelId: z.string() }),
        },
    }, async (request, reply) => {
        const setting = await messagesService(request.log).getChannelNotification(
            request.params.channelId,
            request.principal.id,
        )
        return reply.send(setting)
    })

    // PUT /v1/community/channels/:channelId/notifications
    fastify.put('/channels/:channelId/notifications', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ channelId: z.string() }),
            body: z.object({
                level: z.enum(['default', 'all', 'mentions', 'nothing']).optional(),
                isMuted: z.boolean().optional(),
                mutedUntil: z.string().nullable().optional(),
            }),
        },
    }, async (request, reply) => {
        const updated = await messagesService(request.log).updateChannelNotification({
            channelId: request.params.channelId,
            userId: request.principal.id,
            level: request.body.level,
            isMuted: request.body.isMuted,
            mutedUntil: request.body.mutedUntil,
        })
        return reply.send(updated)
    })

    // ── Threads ───────────────────────────────────────────────────────────

    // GET /v1/community/channels/:channelId/threads
    fastify.get('/channels/:channelId/threads', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ channelId: z.string() }),
            querystring: z.object({ search: z.string().optional() }),
        },
    }, async (request, reply) => {
        const threads = await messagesService(request.log).listThreads(
            request.params.channelId,
            request.query.search,
        )
        return reply.send(threads)
    })

    // POST /v1/community/channels/:channelId/threads
    fastify.post('/channels/:channelId/threads', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ channelId: z.string() }),
            body: z.object({
                name: z.string().min(1).max(100),
                creatorName: z.string().optional(),
                creatorAvatar: z.string().nullable().optional(),
                initialMessage: z.string().optional(),
            }),
        },
    }, async (request, reply) => {
        const thread = await messagesService(request.log).createThread({
            channelId: request.params.channelId,
            name: request.body.name,
            creatorId: request.principal.id,
            creatorName: request.body.creatorName || 'Anonymous',
            creatorAvatar: request.body.creatorAvatar ?? null,
            initialMessageContent: request.body.initialMessage,
        })
        return reply.status(StatusCodes.CREATED).send(thread)
    })

    // GET /v1/community/threads/:threadId/messages
    fastify.get('/threads/:threadId/messages', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ threadId: z.string() }),
            querystring: z.object({ limit: z.coerce.number().min(1).max(200).default(100) }),
        },
    }, async (request, reply) => {
        const messages = await messagesService(request.log).listThreadMessages(
            request.params.threadId,
            request.query.limit,
        )
        return reply.send(messages)
    })

    // POST /v1/community/threads/:threadId/messages
    fastify.post('/threads/:threadId/messages', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ threadId: z.string() }),
            body: z.object({
                channelId: z.string(),
                content: z.string().min(1).max(4000),
                senderName: z.string().optional(),
                senderAvatar: z.string().nullable().optional(),
                senderRole: z.string().optional(),
                attachments: z.record(z.string(), z.unknown()).nullable().optional(),
            }),
        },
    }, async (request, reply) => {
        const msg = await messagesService(request.log).sendThreadMessage({
            threadId: request.params.threadId,
            channelId: request.body.channelId,
            senderId: request.principal.id,
            senderName: request.body.senderName || 'Anonymous',
            senderEmail: '',
            senderAvatar: request.body.senderAvatar ?? null,
            senderRole: request.body.senderRole || 'member',
            content: request.body.content,
            attachments: request.body.attachments ?? null,
        })
        return reply.status(StatusCodes.CREATED).send(msg)
    })

    // ── Members ────────────────────────────────────────────────────────────

    // GET /v1/community/members
    fastify.get('/members', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            querystring: z.object({ hubId: z.string().optional() }),
        },
    }, async (request, reply) => {
        const members = await messagesService(request.log).listMembers(
            request.principal.platform.id,
            request.query.hubId,
        )
        return reply.send(members)
    })

    // POST /v1/community/dm — get or create a DM channel between two users
    fastify.post('/dm', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            body: z.object({ targetUserId: z.string() }),
        },
    }, async (request, reply) => {
        const channel = await messagesService(request.log).getOrCreateDm({
            platformId: request.principal.platform.id,
            userId1: request.principal.id,
            userId2: request.body.targetUserId,
        })
        return reply.send(channel)
    })

    // GET /v1/community/dm/me — list all DM channels for the current user
    fastify.get('/dm/me', {
        config: communitySecurity,
        schema: { tags: ['community'] },
    }, async (request, reply) => {
        const channels = await messagesService(request.log).listDmChannelsForUser(
            request.principal.platform.id,
            request.principal.id,
        )
        return reply.send(channels)
    })

    // ── Server Emojis ─────────────────────────────────────────────────────────

    // GET /v1/community/hubs/:hubId/emojis
    fastify.get('/hubs/:hubId/emojis', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ hubId: z.string() }),
        },
    }, async (request, reply) => {
        const emojis = await messagesService(request.log).listServerEmojis(request.params.hubId)
        return reply.send(emojis)
    })

    // POST /v1/community/hubs/:hubId/emojis
    fastify.post('/hubs/:hubId/emojis', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ hubId: z.string() }),
            body: z.object({
                name: z.string().min(1).max(100),
                code: z.string().min(1).max(120),
                url: z.string().url(),
            }),
        },
    }, async (request, reply) => {
        const emoji = await messagesService(request.log).addServerEmoji({
            hubId: request.params.hubId,
            name: request.body.name,
            code: request.body.code,
            url: request.body.url,
            uploadedBy: request.principal.id,
        })
        return reply.status(StatusCodes.CREATED).send(emoji)
    })

    // DELETE /v1/community/hubs/:hubId/emojis/:emojiId
    fastify.delete('/hubs/:hubId/emojis/:emojiId', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ hubId: z.string(), emojiId: z.string() }),
        },
    }, async (request, reply) => {
        await messagesService(request.log).deleteServerEmoji(request.params.emojiId, request.params.hubId)
        return reply.status(StatusCodes.NO_CONTENT).send()
    })

    // ── Server Stickers ───────────────────────────────────────────────────────

    // GET /v1/community/hubs/:hubId/stickers
    fastify.get('/hubs/:hubId/stickers', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ hubId: z.string() }),
        },
    }, async (request, reply) => {
        const stickers = await messagesService(request.log).listServerStickers(request.params.hubId)
        return reply.send(stickers)
    })

    // POST /v1/community/hubs/:hubId/stickers
    fastify.post('/hubs/:hubId/stickers', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ hubId: z.string() }),
            body: z.object({
                name: z.string().min(1).max(100),
                url: z.string().url(),
                tags: z.array(z.string()).optional(),
            }),
        },
    }, async (request, reply) => {
        const sticker = await messagesService(request.log).addServerSticker({
            hubId: request.params.hubId,
            name: request.body.name,
            url: request.body.url,
            tags: request.body.tags,
            uploadedBy: request.principal.id,
        })
        return reply.status(StatusCodes.CREATED).send(sticker)
    })

    // DELETE /v1/community/hubs/:hubId/stickers/:stickerId
    fastify.delete('/hubs/:hubId/stickers/:stickerId', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ hubId: z.string(), stickerId: z.string() }),
        },
    }, async (request, reply) => {
        await messagesService(request.log).deleteServerSticker(request.params.stickerId, request.params.hubId)
        return reply.status(StatusCodes.NO_CONTENT).send()
    })
}

export const communityController = messagesController
