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
            }),
        },
    }, async (request, reply) => {
        const channel = await messagesService(request.log).createChannel({
            platformId: request.principal.platform.id,
            hubId: request.body.hubId,
            name: request.body.name,
            description: request.body.description,
            category: request.body.category,
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
}

export const communityController = messagesController
