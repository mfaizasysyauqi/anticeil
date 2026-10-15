"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformProjectService = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const server_utils_1 = require("@activepieces/server-utils");
const shared_1 = require("@activepieces/shared");
const typeorm_1 = require("typeorm");
const app_connection_service_1 = require("../app-connection/app-connection-service/app-connection-service");
const repo_factory_1 = require("../core/db/repo-factory");
const transaction_1 = require("../core/db/transaction");
const flow_service_1 = require("../flows/flow/flow.service");
const build_paginator_1 = require("../helper/pagination/build-paginator");
const pagination_utils_1 = require("../helper/pagination/pagination-utils");
const paginator_1 = require("../helper/pagination/paginator");
const common_1 = require("../helper/system-jobs/common");
const system_job_1 = require("../helper/system-jobs/system-job");
const platform_service_1 = require("../platform/platform.service");
const project_entity_1 = require("./project-entity");
const project_service_1 = require("./project-service");
const user_service_1 = require("../user/user-service");
const job_1 = require("../workers/job");
const platform_queue_migration_service_1 = require("../workers/platform-queue-migration.service");
const concurrency_pool_service_1 = require("../platform/concurrency-pool/concurrency-pool.service");
const platform_plan_service_1 = require("../billing/platform-plan.service");
const worker_group_service_1 = require("../billing/worker-group.service");
const project_member_service_1 = require("./project-members/project-member.service");
const project_plan_entity_1 = require("./project-plan/project-plan.entity");
const project_plan_service_1 = require("./project-plan/project-plan.service");
const projectRepo = (0, repo_factory_1.repoFactory)(project_entity_1.ProjectEntity);
const projectPlanRepo = (0, repo_factory_1.repoFactory)(project_plan_entity_1.ProjectPlanEntity);
const platformProjectService = (log) => ({
    async getForPlatform(params) {
        const { cursorRequest, limit, platformId, displayName, externalId, externalUserId, userId, types, isPrivileged, principalType } = params;
        const accessFilterUser = await resolveAccessFilterUser({ platformId, externalUserId, callerUserId: userId, callerIsPrivileged: isPrivileged, principalType, log });
        if ((0, core_utils_1.isNil)(accessFilterUser)) {
            return pagination_utils_1.paginationHelper.createPage([], null);
        }
        const decodedCursor = pagination_utils_1.paginationHelper.decodeCursor(cursorRequest);
        const paginator = (0, build_paginator_1.buildPaginator)({
            entity: project_entity_1.ProjectEntity,
            query: {
                limit,
                afterCursor: decodedCursor.nextCursor,
                beforeCursor: decodedCursor.previousCursor,
                orderBy: [
                    { field: 'type', order: paginator_1.Order.ASC },
                    { field: 'displayName', order: paginator_1.Order.ASC },
                    { field: 'id', order: paginator_1.Order.ASC },
                ],
            },
        });
        const filters = {
            platformId: (0, typeorm_1.Equal)(platformId),
            ...(0, core_utils_1.spreadIfDefined)('displayName', displayName ? (0, typeorm_1.ILike)(`%${displayName}%`) : undefined),
            ...(0, core_utils_1.spreadIfDefined)('externalId', externalId),
            ...(types && types.length > 0 ? { type: (0, typeorm_1.In)(types) } : {}),
            deleted: (0, typeorm_1.IsNull)(),
        };
        const queryBuilder = projectRepo()
            .createQueryBuilder('project')
            .where(filters);
        await (0, project_service_1.applyProjectsAccessFilters)(queryBuilder, {
            platformId,
            ...accessFilterUser,
        });
        const { data, cursor } = await paginator.paginate(queryBuilder);
        const projects = await enrichProjects(data, log);
        return pagination_utils_1.paginationHelper.createPage(projects, cursor);
    },
    async create(params) {
        const platformPlan = await (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(params.platformId);
        const platform = await (0, platform_service_1.platformService)(log).getOneOrThrow(params.platformId);
        const project = await (0, transaction_1.transaction)(async (entityManager) => {
            const savedProject = await (0, project_service_1.projectService)(log).create({
                ownerId: platform.ownerId,
                displayName: params.displayName,
                platformId: params.platformId,
                externalId: params.externalId,
                metadata: params.metadata,
                maxConcurrentJobs: params.maxConcurrentJobs,
                sensitive: params.sensitive,
                type: shared_1.ProjectType.TEAM,
                callPostCreateHooks: false,
                entityManager,
            });
            await projectPlanRepo(entityManager).upsert({
                id: (0, core_utils_1.apId)(),
                projectId: savedProject.id,
                pieces: [],
                piecesFilterType: shared_1.PiecesFilterType.NONE,
                locked: false,
                name: 'platform',
            }, ['projectId']);
            if (platformPlan.globalConnectionsEnabled) {
                const connectionExternalIds = params.globalConnectionExternalIds ?? [];
                if (connectionExternalIds.length > 0) {
                    await (0, app_connection_service_1.appConnectionsRepo)(entityManager)
                        .createQueryBuilder()
                        .update()
                        .set({
                        projectIds: () => 'array_append("projectIds", :projectId)',
                    })
                        .where({
                        externalId: (0, typeorm_1.In)(connectionExternalIds),
                        platformId: params.platformId,
                        scope: shared_1.AppConnectionScope.PLATFORM,
                    })
                        .andWhere('NOT ("projectIds" @> ARRAY[:projectId]::varchar[])')
                        .setParameter('projectId', savedProject.id)
                        .execute();
                }
            }
            return savedProject;
        });
        await (0, project_service_1.projectService)(log).callProjectPostCreateHooks(project, {
            alertReceiverEmail: params.alertReceiverEmail,
        });
        return this.getWithPlanAndUsageOrThrow(project.id);
    },
    async update({ projectId, request, }) {
        const project = await (0, project_service_1.projectService)(log).getOneOrThrow(projectId);
        const platformPlan = await (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(project.platformId);
        const { globalConnectionExternalIds, maxConcurrentJobs, workerGroupId, ...rest } = request;
        let resolvedPoolId;
        await (0, transaction_1.transaction)(async (entityManager) => {
            resolvedPoolId = await resolvePoolId({ platformId: project.platformId, projectId, maxConcurrentJobs, log });
            await (0, project_service_1.projectService)(log).update(projectId, {
                type: project.type,
                ...rest,
                ...(resolvedPoolId !== undefined ? { poolId: resolvedPoolId } : {}),
                ...(maxConcurrentJobs !== undefined ? { maxConcurrentJobs } : {}),
                ...(platformPlan.workerGroupsEnabled && workerGroupId !== undefined ? { workerGroupId } : {}),
            }, entityManager);
            if (platformPlan.globalConnectionsEnabled && globalConnectionExternalIds) {
                const projectGlobalConnections = await (0, app_connection_service_1.appConnectionsRepo)(entityManager).find({
                    where: {
                        projectIds: (0, typeorm_1.ArrayContains)([projectId]),
                        scope: shared_1.AppConnectionScope.PLATFORM,
                    },
                });
                const existingGlobalConnectionExternalIds = projectGlobalConnections.map(connection => connection.externalId);
                const globalConnectionsToAddProjectTo = globalConnectionExternalIds.filter(externalId => !existingGlobalConnectionExternalIds.includes(externalId)) ?? [];
                const globalConnectionsToRemoveProjectFrom = existingGlobalConnectionExternalIds.filter(externalId => !globalConnectionExternalIds?.includes(externalId)) ?? [];
                if (globalConnectionsToAddProjectTo.length > 0) {
                    await (0, app_connection_service_1.appConnectionsRepo)(entityManager).createQueryBuilder()
                        .update()
                        .set({
                        projectIds: () => 'array_append("projectIds", :projectId)',
                    })
                        .where({
                        platformId: project.platformId,
                        externalId: (0, typeorm_1.In)(globalConnectionsToAddProjectTo),
                        scope: shared_1.AppConnectionScope.PLATFORM,
                    })
                        .andWhere('NOT ("projectIds" @> ARRAY[:projectId]::varchar[])')
                        .setParameter('projectId', projectId)
                        .execute();
                }
                if (globalConnectionsToRemoveProjectFrom.length > 0) {
                    await (0, app_connection_service_1.appConnectionsRepo)(entityManager).createQueryBuilder()
                        .update()
                        .set({
                        projectIds: () => 'array_remove("projectIds", :projectId)',
                    })
                        .where({
                        platformId: project.platformId,
                        externalId: (0, typeorm_1.In)(globalConnectionsToRemoveProjectFrom),
                        scope: shared_1.AppConnectionScope.PLATFORM,
                    })
                        .andWhere('("projectIds" @> ARRAY[:projectId]::varchar[])')
                        .setParameter('projectId', projectId)
                        .execute();
                }
            }
            if (!(0, core_utils_1.isNil)(request.plan) && request.plan.activeFlowsLimit !== undefined) {
                const platform = await (0, platform_service_1.platformService)(log).getOneWithPlanOrThrow(project.platformId);
                if (platform.plan.billedTeamProjectsLimit !== 0) {
                    await (0, project_plan_service_1.projectLimitsService)(log).updateActiveFlowsLimit({
                        projectId,
                        activeFlowsLimit: request.plan.activeFlowsLimit,
                        entityManager,
                    });
                }
            }
        });
        if (resolvedPoolId !== undefined) {
            await (0, concurrency_pool_service_1.concurrencyPoolService)(log).assignProject({ projectId, poolId: resolvedPoolId });
        }
        const previousGroupId = project.workerGroupId ?? null;
        if (platformPlan.workerGroupsEnabled && workerGroupId !== undefined && previousGroupId !== workerGroupId) {
            await migrateJobsToNewGroupQueue({
                projectId,
                platformId: project.platformId,
                fromGroupId: previousGroupId,
                toGroupId: workerGroupId,
                log,
            });
        }
        return this.getWithPlanAndUsageOrThrow(projectId);
    },
    async getWithPlanAndUsageOrThrow(projectId) {
        const project = await projectRepo().findOneByOrFail({
            id: projectId,
        });
        return (await enrichProjects([project], log))[0];
    },
    async deletePersonalProjectForUser({ userId, platformId }) {
        const platform = await (0, platform_service_1.platformService)(log).getOneOrThrow(platformId);
        const personalProjects = await projectRepo().find({
            where: {
                platformId,
                ownerId: userId,
                type: shared_1.ProjectType.PERSONAL,
            },
            withDeleted: true,
        });
        await (0, transaction_1.transaction)(async (entityManager) => {
            for (const p of personalProjects) {
                if (!p.deleted) {
                    await projectRepo(entityManager).softDelete({ id: p.id, platformId });
                }
            }
            await projectRepo(entityManager).createQueryBuilder()
                .update()
                .set({ ownerId: platform.ownerId })
                .where('"ownerId" = :userId', { userId })
                .execute();
        });
        for (const p of personalProjects) {
            await scheduleHardDeleteProjectJob({ id: p.id, platformId, log });
        }
    },
    async markForDeletion({ id, platformId }) {
        const result = await projectRepo()
            .createQueryBuilder()
            .softDelete()
            .where('"id" = :id AND "platformId" = :platformId', { id, platformId })
            .returning('id')
            .execute();
        const deletedRows = result.raw ?? [];
        if (deletedRows.length === 0) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityType: 'project',
                    entityId: id,
                },
            });
        }
        await scheduleHardDeleteProjectJob({ id, platformId, log });
    },
});
exports.platformProjectService = platformProjectService;
async function scheduleHardDeleteProjectJob({ id, platformId, log }) {
    await (0, system_job_1.systemJobsSchedule)(log).upsertJob({
        job: {
            name: common_1.SystemJobName.HARD_DELETE_PROJECT,
            data: {
                projectId: id,
                platformId,
                preDeletedFlowIds: [],
            },
            jobId: `hard-delete-project-${id}`,
        },
        schedule: {
            type: 'one-time',
            date: (0, server_utils_1.apDayjs)(),
        },
        customConfig: {
            attempts: 25,
            backoff: {
                type: 'fixed',
                delay: 60000,
            },
        },
    });
}
async function enrichProjects(projects, log) {
    if (projects.length === 0)
        return [];
    const projectIds = projects.map(p => p.id);
    const [totalUsersMap, activeUsersMap, totalFlowsMap, activeFlowsMap, lastFlowUpdatedMap, plansMap] = await Promise.all([
        (0, project_member_service_1.projectMemberService)(log).countTotalUsersByProjects(projectIds),
        (0, project_member_service_1.projectMemberService)(log).countActiveUsersByProjects(projectIds),
        (0, flow_service_1.flowService)(log).countFlowsByProjects(projectIds),
        (0, flow_service_1.flowService)(log).countActiveFlowsByProjects(projectIds),
        (0, flow_service_1.flowService)(log).getLastFlowUpdatedByProjects(projectIds),
        (0, project_plan_service_1.projectLimitsService)(log).getOrCreateDefaultPlansForProjects(projectIds),
    ]);
    return projects.map(project => {
        return {
            ...project,
            plan: plansMap.get(project.id),
            analytics: {
                activeFlows: activeFlowsMap.get(project.id) ?? 0,
                totalFlows: totalFlowsMap.get(project.id) ?? 0,
                totalUsers: totalUsersMap.get(project.id) ?? 0,
                activeUsers: activeUsersMap.get(project.id) ?? 0,
                lastFlowUpdated: lastFlowUpdatedMap.get(project.id) ?? null,
            },
        };
    });
}
async function resolveAccessFilterUser({ platformId, externalUserId, callerUserId, callerIsPrivileged, principalType, log }) {
    if ((0, core_utils_1.isNil)(externalUserId)) {
        return { userId: callerUserId, isPrivileged: callerIsPrivileged };
    }
    if (principalType !== shared_1.PrincipalType.SERVICE) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {},
        });
    }
    const user = await (0, user_service_1.userService)(log).getByPlatformAndExternalId({ platformId, externalId: externalUserId });
    if ((0, core_utils_1.isNil)(user)) {
        return null;
    }
    return { userId: user.id, isPrivileged: false };
}
async function resolvePoolId({ platformId, projectId, maxConcurrentJobs, log }) {
    if (typeof maxConcurrentJobs === 'number') {
        const { poolId } = await (0, concurrency_pool_service_1.concurrencyPoolService)(log).upsertPool({
            platformId,
            key: projectId,
            maxConcurrentJobs,
        });
        return poolId;
    }
    if (maxConcurrentJobs === null) {
        return null;
    }
    return undefined;
}
async function migrateJobsToNewGroupQueue({ projectId, platformId, fromGroupId, toGroupId, log }) {
    const ungroupedQueueName = await resolveUngroupedQueueName({ platformId, log });
    const { error } = await (0, core_utils_1.tryCatch)(() => (0, platform_queue_migration_service_1.platformQueueMigrationService)(log).migrateProjectJobs({
        fromQueueName: (0, core_utils_1.isNil)(fromGroupId) ? ungroupedQueueName : (0, job_1.getProjectGroupQueueName)(fromGroupId),
        toQueueName: (0, core_utils_1.isNil)(toGroupId) ? ungroupedQueueName : (0, job_1.getProjectGroupQueueName)(toGroupId),
        projectId,
    }));
    if (error) {
        log.error({ project: { id: projectId }, platform: { id: platformId }, error }, '[platformProjectService#update] Failed to migrate waiting jobs to the new worker group queue');
    }
}
async function resolveUngroupedQueueName({ platformId, log }) {
    const platformGroupId = await (0, worker_group_service_1.workerGroupService)(log).getWorkerGroupId({ platformId });
    return (0, core_utils_1.isNil)(platformGroupId) ? job_1.QueueName.WORKER_JOBS : (0, job_1.getPlatformGroupQueueName)(platformGroupId);
}
//# sourceMappingURL=platform-project-service.js.map