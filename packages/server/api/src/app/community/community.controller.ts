import { PrincipalType } from '@activepieces/shared'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { StatusCodes } from 'http-status-codes'
import { z } from 'zod'
import { securityAccess } from '../core/security/authorization/fastify-security'
import { communityService } from './community.service'

const COMMUNITY_PRINCIPALS = [PrincipalType.USER] as const

const communitySecurity = {
    security: securityAccess.publicPlatform(COMMUNITY_PRINCIPALS),
}

export const communityController: FastifyPluginAsyncZod = async (fastify) => {

    // GET /v1/community/channels
    fastify.get('/channels', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            querystring: z.object({ hubId: z.string().optional() }),
        },
    }, async (request, reply) => {
        const channels = await communityService(request.log).listChannels(request.principal.platform.id)
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
        const channel = await communityService(request.log).createChannel({
            platformId: request.principal.platform.id,
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
        const updated = await communityService(request.log).updateChannel({
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
        const deleted = await communityService(request.log).deleteChannel(
            request.params.id,
            request.principal.platform.id,
        )
        return reply.send({ success: deleted, id: request.params.id })
    })

    // GET /v1/community/channels/:channelId/messages
    fastify.get('/channels/:channelId/messages', {
        config: communitySecurity,
        schema: {
            tags: ['community'],
            params: z.object({ channelId: z.string() }),
            querystring: z.object({ limit: z.coerce.number().min(1).max(200).default(100) }),
        },
    }, async (request, reply) => {
        const messages = await communityService(request.log).listMessages(
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
                senderName: z.string(),
                senderEmail: z.string().email(),
                senderAvatar: z.string().nullable().optional(),
                senderRole: z.string().default('member'),
                attachments: z.array(z.any()).nullable().optional(),
            }),
        },
    }, async (request, reply) => {
        const msg = await communityService(request.log).sendMessage({
            channelId: request.params.channelId,
            senderId: request.principal.id,
            senderName: request.body.senderName,
            senderEmail: request.body.senderEmail,
            senderAvatar: request.body.senderAvatar ?? null,
            senderRole: request.body.senderRole,
            content: request.body.content,
            attachments: request.body.attachments as object | null,
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
        const deleted = await communityService(request.log).deleteMessage(
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
                userId: z.string(),
            }),
        },
    }, async (request, reply) => {
        const updated = await communityService(request.log).toggleReaction({
            messageId: request.params.messageId,
            emoji: request.body.emoji,
            userId: request.body.userId,
            platformId: request.principal.platform.id,
        })
        if (!updated) return reply.status(StatusCodes.NOT_FOUND).send({ message: 'Message not found' })
        return reply.send({ id: updated.id, channelId: updated.channelId, reactions: updated.reactions })
    })

    // GET /v1/community/members
    fastify.get('/members', {
        config: communitySecurity,
        schema: { tags: ['community'] },
    }, async (request, reply) => {
        const members = await communityService(request.log).listMembers(request.principal.platform.id)
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
        const channel = await communityService(request.log).getOrCreateDm({
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
        const channels = await communityService(request.log).listDmChannelsForUser(
            request.principal.platform.id,
            request.principal.id,
        )
        return reply.send(channels)
    })
}
