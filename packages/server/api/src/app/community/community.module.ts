import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { communityController } from './community.controller'

export const communityModule: FastifyPluginAsyncZod = async (app) => {
    // All community routes live under /v1/community
    // The controller handles: /channels, /channels/:id, /channels/:id/messages,
    //                         /messages/:id, /members, /dm
    await app.register(communityController, { prefix: '/v1/community' })
}
