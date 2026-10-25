"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowEngineWorker = void 0;
const shared_1 = require("@activepieces/shared");
const http_status_codes_1 = require("http-status-codes");
const zod_1 = require("zod");
const authorization_1 = require("../authentication/authorization");
const fastify_security_1 = require("../core/security/authorization/fastify-security");
const file_service_1 = require("../file/file.service");
const flow_service_1 = require("../flows/flow/flow.service");
const engine_run_callback_service_1 = require("../flows/flow-run/engine-run-callback-service");
const flow_version_service_1 = require("../flows/flow-version/flow-version.service");
const piece_bundle_1 = require("../pieces/piece-bundle");
const fs = require("fs");
const flowEngineWorker = async (app) => {
    app.addHook('preSerialization', authorization_1.entitiesMustBeOwnedByCurrentProject);
    app.get('/populated-flows', GetAllFlowsByProjectParams, async (request) => {
        return (0, flow_service_1.flowService)(request.log).list({
            projectIds: [request.principal.projectId],
            limit: request.query.limit ?? 1000000,
            cursorRequest: request.query.cursor ?? null,
            folderId: request.query.folderId,
            status: request.query.status,
            name: request.query.name,
            versionState: request.query.versionState,
            connectionExternalIds: request.query.connectionExternalIds,
            agentExternalIds: request.query.agentExternalIds,
            externalIds: request.query.externalIds,
        });
    });
    app.get('/flows', GetLockedVersionRequest, async (request) => {
        const flowVersion = await (0, flow_version_service_1.flowVersionService)(request.log).getOneOrThrow(request.query.versionId);
        await (0, flow_service_1.flowService)(request.log).getOneOrThrow({
            id: flowVersion.flowId,
            projectId: request.principal.projectId,
        });
        return flowVersion;
    });
    // The pool downloads this with the engine token in the Authorization header (Bearer) and follows
    // the redirect. The engine token is platform-scoped, which scopes custom-piece resolution.
    app.get('/pieces/bundle', PieceBundleRequest, async (request, reply) => {
        if (request.principal.type !== shared_1.PrincipalType.ENGINE) {
            return reply.status(http_status_codes_1.StatusCodes.UNAUTHORIZED).send();
        }
        const resolution = await (0, piece_bundle_1.pieceBundle)(request.log).resolve({
            name: request.query.name,
            version: request.query.version,
            archiveId: request.query.archiveId,
            platformId: request.principal.platform.id,
            projectId: request.principal.projectId,
        });
        if (resolution.type === 'not-found') {
            return reply.status(http_status_codes_1.StatusCodes.NOT_FOUND).send();
        }
        // --- ANTICEIL PATCH: Handle local-file resolution for anticeil-chat ---
        if (resolution.type === 'local-file') {
            request.log.info({ filePath: resolution.filePath }, '[Anticeil engineController] Serving local piece bundle file');
            const fileData = fs.readFileSync(resolution.filePath);
            return reply
                .status(http_status_codes_1.StatusCodes.OK)
                .header('Content-Type', 'application/octet-stream')
                .header('Content-Disposition', 'attachment; filename="piece-bundle.tgz"')
                .send(fileData);
        }
        // --- END ANTICEIL PATCH ---
        if (resolution.type === 'redirect') {
            return reply.status(http_status_codes_1.StatusCodes.TEMPORARY_REDIRECT).header('Location', resolution.url).send();
        }
        const { data } = await (0, file_service_1.fileService)(request.log).getDataOrThrow({
            fileId: resolution.archiveId,
            projectId: undefined,
            type: shared_1.FileType.PACKAGE_ARCHIVE,
        });
        return reply
            .status(http_status_codes_1.StatusCodes.OK)
            .header('Content-Type', 'application/octet-stream')
            .send(data);
    });
    app.post('/run-progress', RunProgressRequest, async (request, reply) => {
        (0, engine_run_callback_service_1.engineRunCallbackService)(request.log).updateRunProgress({
            projectId: request.principal.projectId,
            request: request.body,
        });
        return reply.status(http_status_codes_1.StatusCodes.OK).send();
    });
    app.post('/step-progress', StepProgressRequest, async (request, reply) => {
        (0, engine_run_callback_service_1.engineRunCallbackService)(request.log).updateStepProgress({
            projectId: request.principal.projectId,
            request: request.body,
        });
        return reply.status(http_status_codes_1.StatusCodes.OK).send();
    });
    app.post('/run-logs', RunLogsRequest, async (request, reply) => {
        await (0, engine_run_callback_service_1.engineRunCallbackService)(request.log).uploadRunLog({
            projectId: request.principal.projectId,
            request: request.body,
        });
        return reply.status(http_status_codes_1.StatusCodes.OK).send();
    });
    app.post('/flow-response', FlowResponseRequest, async (request, reply) => {
        await (0, engine_run_callback_service_1.engineRunCallbackService)(request.log).sendFlowResponse({
            request: request.body,
        });
        return reply.status(http_status_codes_1.StatusCodes.OK).send();
    });
};
exports.flowEngineWorker = flowEngineWorker;
const GetAllFlowsByProjectParams = {
    config: {
        security: fastify_security_1.securityAccess.engine(),
    },
    schema: {
        querystring: shared_1.ListFlowsRequest.omit({ projectId: true }),
    },
};
const GetLockedVersionRequest = {
    config: {
        security: fastify_security_1.securityAccess.engine(),
    },
    schema: {
        querystring: shared_1.GetFlowVersionForWorkerRequest,
        response: {
            [http_status_codes_1.StatusCodes.OK]: shared_1.FlowVersion,
        },
    },
};
const PieceBundleRequest = {
    config: {
        security: fastify_security_1.securityAccess.engine(),
    },
    schema: {
        querystring: zod_1.z.object({
            name: zod_1.z.string().optional(),
            version: zod_1.z.string().optional(),
            archiveId: zod_1.z.string().optional(),
        }),
    },
};
const RunProgressRequest = {
    config: {
        security: fastify_security_1.securityAccess.engine(),
    },
    schema: {
        body: zod_1.z.unknown(),
    },
};
const StepProgressRequest = {
    config: {
        security: fastify_security_1.securityAccess.engine(),
    },
    schema: {
        body: shared_1.UpdateStepProgressRequest,
    },
};
const RunLogsRequest = {
    config: {
        security: fastify_security_1.securityAccess.engine(),
    },
    schema: {
        body: shared_1.UploadRunLogsRequest,
    },
};
const FlowResponseRequest = {
    config: {
        security: fastify_security_1.securityAccess.engine(),
    },
    schema: {
        body: shared_1.SendFlowResponseRequest,
    },
};
