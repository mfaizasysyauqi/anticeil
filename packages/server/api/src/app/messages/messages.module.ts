import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { messagesController } from './messages.controller'

export const messagesModule: FastifyPluginAsyncZod = async (app) => {
    // Primary prefix: /v1/messages
    await app.register(messagesController, { prefix: '/v1/messages' })
    // Backward-compatibility alias
    await app.register(messagesController, { prefix: '/v1/community' })
}
