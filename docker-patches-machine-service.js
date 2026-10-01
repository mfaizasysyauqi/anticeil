"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.machineService = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const server_utils_1 = require("@activepieces/server-utils");
const shared_1 = require("@activepieces/shared");
const worker_group_service_1 = require("../../ee/platform/platform-plan/worker-group.service");
const domain_helper_1 = require("../../helper/domain-helper");
const system_1 = require("../../helper/system/system");
const system_props_1 = require("../../helper/system/system-props");
const machine_cache_1 = require("./machine-cache");
const worker_capacity_1 = require("./worker-capacity");
const worker_liveness_1 = require("./worker-liveness");
const settingsCache = new Map();
async function buildSettingsResponse(_log) {
    const cacheKey = '__shared__';
    const cached = settingsCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const executionMode = system_1.system.getOrThrow(system_props_1.AppSystemProp.EXECUTION_MODE);
    const settings = {
        TRIGGER_TIMEOUT_SECONDS: system_1.system.getNumberOrThrow(system_props_1.AppSystemProp.TRIGGER_TIMEOUT_SECONDS),
        PAUSED_FLOW_TIMEOUT_DAYS: system_1.system.getNumberOrThrow(system_props_1.AppSystemProp.PAUSED_FLOW_TIMEOUT_DAYS),
        EXECUTION_MODE: executionMode,
        TRIGGER_HOOKS_TIMEOUT_SECONDS: system_1.system.getNumberOrThrow(system_props_1.AppSystemProp.TRIGGER_HOOKS_TIMEOUT_SECONDS),
        FLOW_TIMEOUT_SECONDS: system_1.system.getNumberOrThrow(system_props_1.AppSystemProp.FLOW_TIMEOUT_SECONDS),
        LOG_LEVEL: system_1.system.getOrThrow(system_props_1.AppSystemProp.LOG_LEVEL),
        LOG_PRETTY: system_1.system.getOrThrow(system_props_1.AppSystemProp.LOG_PRETTY),
        ENVIRONMENT: system_1.system.getOrThrow(system_props_1.AppSystemProp.ENVIRONMENT),
        APP_WEBHOOK_SECRETS: system_1.system.getOrThrow(system_props_1.AppSystemProp.APP_WEBHOOK_SECRETS),
        MAX_FLOW_RUN_LOG_SIZE_MB: system_1.system.getNumberOrThrow(system_props_1.AppSystemProp.MAX_FLOW_RUN_LOG_SIZE_MB),
        FLOW_RUN_LOG_INPUT_TRUNCATE_THRESHOLD_KB: system_1.system.getNumberOrThrow(system_props_1.AppSystemProp.FLOW_RUN_LOG_INPUT_TRUNCATE_THRESHOLD_KB),
        FLOW_RUN_LOG_SLICE_THRESHOLD_KB: system_1.system.getNumberOrThrow(system_props_1.AppSystemProp.FLOW_RUN_LOG_SLICE_THRESHOLD_KB),
        MAX_FILE_SIZE_MB: system_1.system.getNumberOrThrow(system_props_1.AppSystemProp.MAX_FILE_SIZE_MB),
        SANDBOX_MEMORY_LIMIT: system_1.system.getOrThrow(system_props_1.AppSystemProp.SANDBOX_MEMORY_LIMIT),
        SANDBOX_PROPAGATED_ENV_VARS: system_1.system.get(system_props_1.AppSystemProp.SANDBOX_PROPAGATED_ENV_VARS)?.split(',').map(f => f.trim()) ?? [],
        DEV_PIECES: system_1.system.get(system_props_1.AppSystemProp.DEV_PIECES)?.split(',') ?? [],
        SENTRY_DSN: system_1.system.get(system_props_1.AppSystemProp.SENTRY_DSN),
        LOKI_PASSWORD: system_1.system.get(system_props_1.AppSystemProp.LOKI_PASSWORD),
        LOKI_URL: system_1.system.get(system_props_1.AppSystemProp.LOKI_URL),
        LOKI_USERNAME: system_1.system.get(system_props_1.AppSystemProp.LOKI_USERNAME),
        BETTERSTACK_HOST: system_1.system.get(system_props_1.AppSystemProp.BETTERSTACK_HOST),
        BETTERSTACK_TOKEN: system_1.system.get(system_props_1.AppSystemProp.BETTERSTACK_TOKEN),
        PUBLIC_URL: await domain_helper_1.domainHelper.getInternalUrl({
            path: '',
        }),
        FILE_STORAGE_LOCATION: system_1.system.getOrThrow(system_props_1.AppSystemProp.FILE_STORAGE_LOCATION),
        S3_USE_SIGNED_URLS: system_1.system.getOrThrow(system_props_1.AppSystemProp.S3_USE_SIGNED_URLS),
        EVENT_DESTINATION_TIMEOUT_SECONDS: system_1.system.getNumberOrThrow(system_props_1.AppSystemProp.EVENT_DESTINATION_TIMEOUT_SECONDS),
        EDITION: system_1.system.getOrThrow(system_props_1.AppSystemProp.EDITION),
        SSRF_ALLOW_LIST: system_1.system.get(system_props_1.AppSystemProp.SSRF_ALLOW_LIST)?.split(',').map(f => f.trim()) ?? [],
        ENFORCE_CONNECTION_PIECE_BINDING: system_1.system.getBoolean(system_props_1.AppSystemProp.ENFORCE_CONNECTION_PIECE_BINDING) ?? false,
        NETWORK_MODE: system_1.system.getOrThrow(system_props_1.AppSystemProp.NETWORK_MODE),
        PAGE_ONCALL_WEBHOOK: system_1.system.get(system_props_1.AppSystemProp.PAGE_ONCALL_WEBHOOK),
        APP_VERSION: server_utils_1.apVersionUtil.getCurrentRelease(),
    };
    settingsCache.set(cacheKey, settings);
    return settings;
}
const machineService = (log) => {
    return {
        async onDisconnect(request) {
            log.info({
                message: 'Worker disconnected',
                worker: { id: request.workerId },
            });
            await (0, machine_cache_1.workerMachineCache)().delete([request.workerId]);
            await worker_capacity_1.workerCapacity.invalidate();
        },
        async onConnection(request, assignment = null) {
            const existingWorker = await (0, machine_cache_1.workerMachineCache)().findOne(request.workerId);
            const type = (0, core_utils_1.isNil)(assignment) ? 'SHARED' : 'DEDICATED';
            await (0, machine_cache_1.workerMachineCache)().upsert({
                id: request.workerId,
                information: request,
                type,
                workerGroupId: assignment?.id,
                workerGroupScope: assignment?.scope,
            }, existingWorker);
            // Only a newly-seen worker changes capacity; heartbeats from known workers don't.
            if ((0, core_utils_1.isNil)(existingWorker)) {
                await worker_capacity_1.workerCapacity.invalidate();
            }
            return buildSettingsResponse(log);
        },
        async list(platformId) {
            const allWorkers = await (0, machine_cache_1.workerMachineCache)().find();
            const { online: onlineWorkers, offline: offlineWorkers } = worker_liveness_1.workerLiveness.partitionByLiveness(allWorkers);
            await (0, machine_cache_1.workerMachineCache)().delete(offlineWorkers.map(worker => worker.id));
            const platformWorkerGroupId = await (0, worker_group_service_1.workerGroupService)(log).getWorkerGroupId({ platformId });
            return onlineWorkers
                .filter(worker => {
                if (worker.workerGroupScope === shared_1.WorkerGroupScope.PLATFORM) {
                    return !(0, core_utils_1.isNil)(platformWorkerGroupId) && worker.workerGroupId === platformWorkerGroupId;
                }
                if (worker.workerGroupScope === shared_1.WorkerGroupScope.PROJECT) {
                    return true;
                }
                return (0, core_utils_1.isNil)(platformWorkerGroupId);
            })
                .map(worker => ({
                ...worker,
                status: shared_1.WorkerMachineStatus.ONLINE,
                type: worker.type === 'DEDICATED' ? shared_1.WorkerMachineType.DEDICATED : shared_1.WorkerMachineType.SHARED,
                workerGroupId: worker.workerGroupId,
                workerGroupScope: worker.workerGroupScope,
            }));
        },
        async listProjectWorkerGroups() {
            const { online: onlineWorkers } = worker_liveness_1.workerLiveness.partitionByLiveness(await (0, machine_cache_1.workerMachineCache)().find());
            const slotsByLabel = new Map();
            let sharedSlots = 0;
            for (const worker of onlineWorkers) {
                const slots = (0, worker_capacity_1.parseWorkerConcurrency)(worker.information.workerProps.WORKER_CONCURRENCY);
                if (worker.workerGroupScope === shared_1.WorkerGroupScope.PROJECT && !(0, core_utils_1.isNil)(worker.workerGroupId) && worker.workerGroupId.length > 0) {
                    slotsByLabel.set(worker.workerGroupId, (slotsByLabel.get(worker.workerGroupId) ?? 0) + slots);
                }
                else if ((0, core_utils_1.isNil)(worker.workerGroupScope)) {
                    sharedSlots += slots;
                }
            }
            return {
                groups: [...slotsByLabel.entries()].map(([label, slots]) => ({ label, slots })),
                sharedSlots,
            };
        },
    };
};
exports.machineService = machineService;
