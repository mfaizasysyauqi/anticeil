import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { githubController } from './github.controller'

export const githubModule: FastifyPluginAsyncZod = async (app) => {
    await app.register(githubController, {
        prefix: '/v1/github',
    })
}
