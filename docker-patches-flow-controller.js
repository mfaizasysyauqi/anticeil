"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flowController = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const http_status_codes_1 = require("http-status-codes");
const zod_1 = require("zod");
const authorization_1 = require("../../authentication/authorization");
const common_1 = require("../../core/security/authorization/common");
const fastify_security_1 = require("../../core/security/authorization/fastify-security");
const rbac_middleware_1 = require("../../authentication/project-role/rbac-middleware");
let platform_plan_service_1, project_plan_service_1;
try { platform_plan_service_1 = require("../../billing/platform-plan.service"); } catch(e) { try { platform_plan_service_1 = require("../../ee/platform/platform-plan/platform-plan.service"); } catch(e2) { platform_plan_service_1 = null; } }
try { project_plan_service_1 = require("../../project/project-plan/project-plan.service"); } catch(e) { try { project_plan_service_1 = require("../../ee/project-plan/project-plan.service"); } catch(e2) { project_plan_service_1 = null; } }
const git_sync_service_1 = require("../../project/project-release/git-sync/git-sync.service");
const network_utils_1 = require("../../helper/network-utils");
const user_service_1 = require("../../user/user-service");
const migrations_1 = require("../flow-version/migrations");
const flow_entity_1 = require("./flow.entity");
const flow_service_1 = require("./flow.service");
const DEFAULT_PAGE_SIZE = 10;
const flowController = async (app) => {
    app.addHook('preSerialization', authorization_1.entitiesMustBeOwnedByCurrentProject);
    app.post('/', CreateFlowRequestOptions, async (request, reply) => {
        const newFlow = await (0, flow_service_1.flowService)(request.log).create({
            projectId: request.projectId,
            request: request.body,
            ownerId: actorUserId(request),
            templateId: request.body.templateId,
            ip: network_utils_1.networkUtils.clientIp(request),
            externalId: request.body.externalId,
        });
        return reply.status(http_status_codes_1.StatusCodes.CREATED).send(newFlow);
    });
    app.post('/:id', {
        config: {
            security: fastify_security_1.securityAccess.project([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE], core_utils_1.Permission.UPDATE_FLOW_STATUS, {
                type: common_1.ProjectResourceType.TABLE,
                tableName: flow_entity_1.FlowEntity,
            }),
        },
        schema: {
            tags: ['flows'],
            description: 'Apply an operation to a flow',
            security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
            body: shared_1.FlowOperationRequest,
            params: zod_1.z.object({
                id: core_utils_1.ApId,
            }),
        },
        preValidation: async (request) => {
            if (request.body?.type === shared_1.FlowOperationType.IMPORT_FLOW) {
                const migratedFlowTemplate = await (0, migrations_1.migrateFlowVersionTemplate)({
                    displayName: request.body.request.displayName,
                    trigger: request.body.request.trigger,
                    //because the target for the first migraiton is undefined not null
                    schemaVersion: request.body.request.schemaVersion ?? undefined,
                    notes: request.body.request.notes ?? [],
                    valid: false,
                });
                request.body.request = {
                    ...request.body.request,
                    displayName: migratedFlowTemplate.displayName,
                    trigger: migratedFlowTemplate.trigger,
                    schemaVersion: migratedFlowTemplate.schemaVersion,
                    notes: migratedFlowTemplate.notes,
                };
            }
        },
    }, async (request) => {
        await (0, rbac_middleware_1.assertUserHasPermissionToFlow)(request.principal, request.projectId, request.body.type, request.log);
        const flow = await (0, flow_service_1.flowService)(request.log).getOnePopulatedOrThrow({
            id: request.params.id,
            projectId: request.projectId,
        });
        const turnOnFlow = request.body.type === shared_1.FlowOperationType.CHANGE_STATUS && request.body.request.status === shared_1.FlowStatus.ENABLED && flow.status === shared_1.FlowStatus.DISABLED;
        const publishDisabledFlow = request.body.type === shared_1.FlowOperationType.LOCK_AND_PUBLISH && flow.status === shared_1.FlowStatus.DISABLED;
        if (turnOnFlow || publishDisabledFlow) {
            if (platform_plan_service_1) await (0, platform_plan_service_1.platformPlanService)(request.log).checkActiveFlowsExceededLimit(request.principal.platform.id);
            if (project_plan_service_1) await (0, project_plan_service_1.projectLimitsService)(request.log).checkActiveFlowsExceededLimit({
                projectId: request.projectId,
            });
        }
        const updatedFlow = await (0, flow_service_1.flowService)(request.log).update({
            id: request.params.id,
            userId: actorUserId(request),
            platformId: request.principal.platform.id,
            projectId: request.projectId,
            operation: cleanOperation(request.body),
            previousFlow: flow,
            ip: network_utils_1.networkUtils.clientIp(request),
        });
        try {
            const { websocketService } = await Promise.resolve().then(() => require('../../core/websockets.service'));
            websocketService.to(request.projectId).emit('FLOW_UPDATED', {
                flowId: request.params.id,
                userId: actorUserId(request),
                version: updatedFlow.version,
            });
        }
        catch (e) {
            request.log.error({ error: e }, '[FLOW_UPDATED] Failed to broadcast flow update');
        }
        return updatedFlow;
    });
    app.get('/', ListFlowsRequestOptions, async (request) => {
        return (0, flow_service_1.flowService)(request.log).list({
            projectIds: [request.projectId],
            folderId: request.query.folderId,
            folderIds: request.query.folderIds,
            cursorRequest: request.query.cursor ?? null,
            limit: request.query.limit ?? DEFAULT_PAGE_SIZE,
            status: request.query.status,
            name: request.query.name,
            versionState: request.query.versionState,
            externalIds: request.query.externalIds,
            connectionExternalIds: request.query.connectionExternalIds,
            agentExternalIds: request.query.agentExternalIds,
            sortBy: request.query.sortBy,
            order: request.query.order,
        });
    });
    app.get('/count', CountFlowsRequestOptions, async (request) => {
        return (0, flow_service_1.flowService)(request.log).count({
            folderId: request.query.folderId,
            projectId: request.projectId,
        });
    });
    app.get('/:id/template', GetFlowTemplateRequestOptions, async (request) => {
        const userMetadata = request.principal.type === shared_1.PrincipalType.USER ? await (0, user_service_1.userService)(request.log).getMetaInformation({ id: request.principal.id }) : null;
        return (0, flow_service_1.flowService)(request.log).getTemplate({
            flowId: request.params.id,
            userMetadata,
            projectId: request.projectId,
            versionId: undefined,
        });
    });
    app.get('/:id', GetFlowRequestOptions, async (request) => {
        return (0, flow_service_1.flowService)(request.log).getOnePopulatedOrThrow({
            id: request.params.id,
            projectId: request.projectId,
            versionId: request.query.versionId,
        });
    });
    app.delete('/:id', DeleteFlowRequestOptions, async (request, reply) => {
        const flow = await (0, flow_service_1.flowService)(request.log).getOnePopulatedOrThrow({
            id: request.params.id,
            projectId: request.projectId,
        });
        await (0, git_sync_service_1.gitRepoService)(request.log).onDeleted({
            type: shared_1.GitPushOperationType.DELETE_FLOW,
            externalId: flow.externalId,
            userId: request.principal.id,
            projectId: request.projectId,
            platformId: request.principal.platform.id,
            log: request.log,
        });
        await (0, flow_service_1.flowService)(request.log).delete({
            id: request.params.id,
            projectId: request.projectId,
            previousFlow: flow,
            userId: actorUserId(request),
            ip: network_utils_1.networkUtils.clientIp(request),
        });
        return reply.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
    });
};
exports.flowController = flowController;
function actorUserId(request) {
    return request.principal.type === shared_1.PrincipalType.USER ? request.principal.id : undefined;
}
function cleanOperation(operation) {
    if (operation.type === shared_1.FlowOperationType.IMPORT_FLOW) {
        const clearSampleData = {
            sampleDataFileId: undefined,
            sampleDataInputFileId: undefined,
            lastTestDate: undefined,
        };
        const trigger = shared_1.flowStructureUtil.transferStep(operation.request.trigger, (step) => ({
            ...step,
            settings: {
                ...step.settings,
                sampleData: {
                    ...step.settings.sampleData,
                    ...clearSampleData,
                },
            },
        }));
        return {
            ...operation,
            request: {
                ...operation.request,
                trigger,
            },
        };
    }
    return operation;
}
const CreateFlowRequestOptions = {
    config: {
        security: fastify_security_1.securityAccess.project([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE], core_utils_1.Permission.WRITE_FLOW, {
            type: common_1.ProjectResourceType.BODY,
        }),
    },
    schema: {
        tags: ['flows'],
        description: 'Create a flow',
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        body: shared_1.CreateFlowRequest,
        response: {
            [http_status_codes_1.StatusCodes.CREATED]: shared_1.PopulatedFlow,
        },
    },
};
const ListFlowsRequestOptions = {
    config: {
        security: fastify_security_1.securityAccess.project([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE], core_utils_1.Permission.READ_FLOW, {
            type: common_1.ProjectResourceType.QUERY,
        }),
    },
    schema: {
        tags: ['flows'],
        description: 'List flows',
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        querystring: shared_1.ListFlowsRequest,
        response: {
            [http_status_codes_1.StatusCodes.OK]: (0, core_utils_1.SeekPage)(shared_1.PopulatedFlow),
        },
    },
};
const CountFlowsRequestOptions = {
    config: {
        security: fastify_security_1.securityAccess.project([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE], core_utils_1.Permission.READ_FLOW, {
            type: common_1.ProjectResourceType.QUERY,
        }),
    },
    schema: {
        querystring: shared_1.CountFlowsRequest,
    },
};
const GetFlowTemplateRequestOptions = {
    config: {
        security: fastify_security_1.securityAccess.project([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE], core_utils_1.Permission.READ_FLOW, {
            type: common_1.ProjectResourceType.TABLE,
            tableName: flow_entity_1.FlowEntity,
        }),
    },
    schema: {
        tags: ['flows'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Export flow as template',
        params: zod_1.z.object({
            id: core_utils_1.ApId,
        }),
        querystring: shared_1.GetFlowTemplateRequestQuery,
        response: {
            [http_status_codes_1.StatusCodes.OK]: shared_1.SharedTemplate,
        },
    },
};
const GetFlowRequestOptions = {
    config: {
        security: fastify_security_1.securityAccess.project([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE], core_utils_1.Permission.READ_FLOW, {
            type: common_1.ProjectResourceType.TABLE,
            tableName: flow_entity_1.FlowEntity,
        }),
    },
    schema: {
        tags: ['flows'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Get a flow by id',
        params: zod_1.z.object({
            id: core_utils_1.ApId,
        }),
        querystring: shared_1.GetFlowQueryParamsRequest,
        response: {
            [http_status_codes_1.StatusCodes.OK]: shared_1.PopulatedFlow,
        },
    },
};
const DeleteFlowRequestOptions = {
    config: {
        security: fastify_security_1.securityAccess.project([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE], core_utils_1.Permission.WRITE_FLOW, {
            type: common_1.ProjectResourceType.TABLE,
            tableName: flow_entity_1.FlowEntity,
        }),
    },
    schema: {
        tags: ['flows'],
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
        description: 'Delete a flow',
        params: zod_1.z.object({
            id: core_utils_1.ApId,
        }),
        response: {
            [http_status_codes_1.StatusCodes.NO_CONTENT]: zod_1.z.never(),
        },
    },
};
