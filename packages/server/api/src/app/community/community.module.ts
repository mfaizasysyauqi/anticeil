import { FastifyPluginAsync } from 'fastify';
import { communityController } from './community.controller';

export const communityModule: FastifyPluginAsync = async (app) => {
  await app.register(communityController, { prefix: '/v1' });
};
