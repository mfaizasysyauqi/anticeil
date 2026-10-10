"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProviderController = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const http_status_codes_1 = require("http-status-codes");
const zod_1 = require("zod");
const common_1 = require("../core/security/authorization/common");
const fastify_security_1 = require("../core/security/authorization/fastify-security");
const ai_provider_service_1 = require("./ai-provider-service");
const aiProviderController = async (app) => {
    app.get('/', ListAIProvidersForProject, async (request) => {
        return (0, ai_provider_service_1.aiProviderService)(app.log).listForProject({
            platformId: request.principal.platform.id,
            projectId: request.projectId,
        });
    });
    app.get('/configs', ListAIProviderConfigs, async (request) => {
        return (0, ai_provider_service_1.aiProviderService)(app.log).listConfigs(request.principal.platform.id);
    });
    app.get('/configs/:id/models', ListModelsForConfig, async (request) => {
        return (0, ai_provider_service_1.aiProviderService)(app.log).listModelsForConfig({
            platformId: request.principal.platform.id,
            configId: request.params.id,
        });
    });
    app.get('/:provider/models', ListModels, async (request) => {
        return (0, ai_provider_service_1.aiProviderService)(app.log).listModels({
            platformId: request.principal.platform.id,
            provider: request.params.provider,
            scope: { type: 'project', projectId: request.projectId },
            ...(0, shared_1.spreadIfDefined)('configId', request.query.configId),
        });
    });
    app.post('/', CreateAIProvider, async (request) => {
        const platformId = request.principal.platform.id;
        return (0, ai_provider_service_1.aiProviderService)(app.log).create(platformId, request.body);
    });
    app.post('/:id/recheck', RecheckAIProvider, async (request) => {
        const status = await (0, ai_provider_service_1.aiProviderService)(app.log).recheck({
            platformId: request.principal.platform.id,
            providerId: request.params.id,
        });
        return { status };
    });
    app.post('/:id', UpdateAIProvider, async (request) => {
        const platformId = request.principal.platform.id;
        return (0, ai_provider_service_1.aiProviderService)(app.log).update(platformId, request.params.id, request.body);
    });
    app.delete('/:id', DeleteAIProvider, async (request, reply) => {
        const platformId = request.principal.platform.id;
        await (0, ai_provider_service_1.aiProviderService)(app.log).delete(platformId, request.params.id);
        return reply.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
    });
};
exports.aiProviderController = aiProviderController;
const ListAIProvidersForProject = {
    config: {
        security: fastify_security_1.securityAccess.project([shared_1.PrincipalType.USER, shared_1.PrincipalType.ENGINE], undefined, { type: common_1.ProjectResourceType.QUERY }),
    },
    schema: {
        querystring: zod_1.z.object({
            projectId: zod_1.z.string().optional(),
        }),
    },
};
const ListAIProviderConfigs = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
};
const ListModelsForConfig = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
    schema: {
        params: zod_1.z.object({
            id: zod_1.z.string(),
        }),
        response: {
            [http_status_codes_1.StatusCodes.OK]: zod_1.z.array(shared_1.AIProviderModel),
        },
    },
};
const ListModels = {
    config: {
        security: fastify_security_1.securityAccess.project([shared_1.PrincipalType.USER, shared_1.PrincipalType.ENGINE], undefined, { type: common_1.ProjectResourceType.QUERY }),
    },
    schema: {
        params: zod_1.z.object({
            provider: zod_1.z.nativeEnum(core_utils_1.AIProviderName),
        }),
        querystring: zod_1.z.object({
            projectId: zod_1.z.string().optional(),
            configId: zod_1.z.string().optional(),
        }),
        response: {
            [http_status_codes_1.StatusCodes.OK]: zod_1.z.array(shared_1.AIProviderModel),
        },
    },
};
const CreateAIProvider = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
    schema: {
        body: shared_1.CreateAIProviderRequest,
    },
};
const RecheckAIProvider = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
    schema: {
        params: zod_1.z.object({
            id: zod_1.z.string(),
        }),
        response: {
            [http_status_codes_1.StatusCodes.OK]: zod_1.z.object({
                status: core_utils_1.AiProviderKeyStatus,
            }),
        },
    },
};
const UpdateAIProvider = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
    schema: {
        params: zod_1.z.object({
            id: zod_1.z.string(),
        }),
        body: shared_1.UpdateAIProviderRequest,
    },
};
const DeleteAIProvider = {
    config: {
        security: fastify_security_1.securityAccess.publicPlatform([shared_1.PrincipalType.USER]),
    },
    schema: {
        params: zod_1.z.object({
            id: zod_1.z.string(),
        }),
    },
};
