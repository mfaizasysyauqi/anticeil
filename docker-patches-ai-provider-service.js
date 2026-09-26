"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProviderService = void 0;
const tslib_1 = require("tslib");
const core_utils_1 = require("@activepieces/core-utils");
const server_utils_1 = require("@activepieces/server-utils");
const shared_1 = require("@activepieces/shared");
const node_cron_1 = tslib_1.__importDefault(require("node-cron"));
const repo_factory_1 = require("../core/db/repo-factory");
const keys_1 = require("../database/redis/keys");
const redis_connections_1 = require("../database/redis-connections");
const openrouter_api_1 = require("../ee/platform/platform-plan/openrouter/openrouter-api");
const flag_service_1 = require("../flags/flag.service");
const encryption_1 = require("../helper/encryption");
const platform_service_1 = require("../platform/platform.service");
const ai_provider_entity_1 = require("./ai-provider-entity");
const ai_provider_health_1 = require("./ai-provider-health");
const providers_1 = require("./providers");
const aiProviderRepo = (0, repo_factory_1.repoFactory)(ai_provider_entity_1.AIProviderEntity);
const modelsCache = new Map();
const MANAGED_OPENROUTER_KEY_MONTHLY_LIMIT_USD = 500;
const MANAGED_OPENROUTER_KEY_LIMIT_RESET = 'monthly';
// A passing check must not lock out the next real failure, so the claim is a floor between
// checks rather than a window that swallows them. A confirmed failure needs no floor: the row
// stops being active, and only an active key asks for confirmation.
const CONFIRM_MIN_INTERVAL_SECONDS = 10;
const aiProviderService = (log) => ({
    async setup() {
        node_cron_1.default.schedule('0 0 * * *', () => {
            log.info('Clearing AI provider models cache');
            modelsCache.clear();
        });
    },
    async listConfigs(platformId) {
        const rows = await listVisibleRows({ platformId, log });
        const chatRowId = pickChatRow(rows)?.id;
        return rows.map((row) => toConfigResponse({ row, enabledForChat: row.id === chatRowId }));
    },
    async listForProject({ platformId, projectId }) {
        const rows = await listVisibleRows({ platformId, log });
        const eligible = rows.filter((row) => rowAllowsScope({ row, scope: { type: 'project', projectId } }));
        const ranked = rankRows(eligible);
        const chatRow = pickChatRow(ranked);
        return (0, core_utils_1.unique)(ranked.map((row) => row.provider)).map((provider) => {
            const rows = ranked.filter((row) => row.provider === provider);
            return {
                provider,
                name: providers_1.aiProviders[provider].name,
                enabledForChat: provider === chatRow?.provider,
                keys: rows.map((row) => ({ id: row.id, name: row.displayName })),
            };
        });
    },
    async listModels({ platformId, provider, scope, configId }) {
        const aiProvider = await resolveRowForScope({ platformId, provider, scope, configId });
        const models = await fetchModels({ aiProvider, platformId, log });
        return aiProvider.modelScope === 'selected'
            ? models.filter((model) => aiProvider.modelIds.includes(model.id))
            : models;
    },
    async listModelsForConfig({ platformId, configId }) {
        const aiProvider = await getRowByIdOrThrow({ platformId, configId });
        return fetchModels({ aiProvider, platformId, log });
    },
    async create(platformId, request) {
        if (request.provider === core_utils_1.AIProviderName.ACTIVEPIECES) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.VALIDATION,
                params: { message: 'aiProvider.activepiecesIsManaged' },
            });
        }
        await assertDisplayNameIsFree({ platformId, provider: request.provider, displayName: request.displayName });
        await this.validateProviderCredentials(request.provider, request.auth, request.config);
        const saved = await aiProviderRepo().save({
            id: (0, core_utils_1.apId)(),
            auth: await encryption_1.encryptUtils.encryptObject(request.auth),
            config: request.config,
            provider: request.provider,
            displayName: request.displayName,
            platformId,
            modelScope: 'all',
            modelIds: [],
            projectScope: 'all',
            projectIds: [],
            status: 'active',
            statusReason: null,
            statusUpdated: new Date().toISOString(),
        });
        return toConfigResponse({ row: saved, enabledForChat: false });
    },
    async update(platformId, providerId, request) {
        const aiProvider = await aiProviderRepo().findOneBy({
            platformId,
            id: providerId,
        });
        if ((0, core_utils_1.isNil)(aiProvider)) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
                params: { entityId: providerId, entityType: shared_1.AI_PROVIDER_ENTITY_TYPES.provider },
            });
        }
        if (aiProvider.provider === core_utils_1.AIProviderName.ACTIVEPIECES) {
            if (request.enabledForChat === true) {
                await aiProviderRepo().manager.transaction(async (manager) => {
                    await manager.update(ai_provider_entity_1.AIProviderEntity, { platformId }, { enabledForChat: false });
                    await manager.update(ai_provider_entity_1.AIProviderEntity, providerId, { enabledForChat: true });
                });
            }
            return;
        }
        await assertDisplayNameIsFree({ platformId, provider: aiProvider.provider, displayName: request.displayName, exceptId: providerId });
        const config = request.config ?? aiProvider.config;
        const revalidated = !(0, core_utils_1.isNil)(request.auth) || !(0, core_utils_1.isNil)(request.config);
        if (!(0, core_utils_1.isNil)(request.auth)) {
            await this.validateProviderCredentials(aiProvider.provider, request.auth, config);
        }
        else if (!(0, core_utils_1.isNil)(request.config)) {
            const auth = await decryptRowAuth({ aiProvider, platformId });
            await this.validateProviderCredentials(aiProvider.provider, auth, config);
        }
        const encryptedAuth = !(0, core_utils_1.isNil)(request.auth) ? await encryption_1.encryptUtils.encryptObject(request.auth) : undefined;
        const updates = {
            ...(0, core_utils_1.spreadIfDefined)('auth', encryptedAuth),
            ...(0, core_utils_1.spreadIfDefined)('config', request.config),
            ...(0, core_utils_1.spreadIfDefined)('enabledForChat', request.enabledForChat),
            ...(0, core_utils_1.spreadIfDefined)('modelScope', request.modelScope),
            ...(0, core_utils_1.spreadIfDefined)('modelIds', request.modelIds),
            ...(0, core_utils_1.spreadIfDefined)('projectScope', request.projectScope),
            ...(0, core_utils_1.spreadIfDefined)('projectIds', request.projectIds),
            ...(revalidated ? provedHealthy() : {}),
            displayName: request.displayName,
        };
        if (request.enabledForChat === true) {
            await aiProviderRepo().manager.transaction(async (manager) => {
                await manager.update(ai_provider_entity_1.AIProviderEntity, { platformId }, { enabledForChat: false });
                await manager.update(ai_provider_entity_1.AIProviderEntity, providerId, updates);
            });
        }
        else {
            await aiProviderRepo().update(providerId, updates);
        }
    },
    async getChatProviderName({ platformId, scope }) {
        const chatProvider = await findAvailableChatProviderRow({ platformId, scope, log });
        return chatProvider?.provider ?? null;
    },
    async getChatProvider({ platformId, scope }) {
        const chatProvider = await findAvailableChatProviderRow({ platformId, scope, log });
        if ((0, core_utils_1.isNil)(chatProvider)) {
            return null;
        }
        const auth = await decryptRowAuth({ aiProvider: chatProvider, platformId });
        return { ...(0, shared_1.aiProviderCredentials)({ provider: chatProvider.provider, auth, config: chatProvider.config }), configId: chatProvider.id, platformId, modelScope: chatProvider.modelScope, modelIds: chatProvider.modelIds };
    },
    async keyServesScope({ platformId, provider, configId, resolvedFor, target }) {
        const candidates = await findRunKeyCandidates({ platformId, provider, configId, scope: resolvedFor, log });
        return candidates.every((row) => target.type === 'platform'
            ? row.projectScope === 'all'
            : rowAllowsScope({ row, scope: target }));
    },
    async exists({ platformId, provider, scope, configId }) {
        const rows = await aiProviderRepo().findBy({ platformId, provider });
        return rows.some((row) => rowAllowsScope({ row, scope }) && ((0, core_utils_1.isNil)(configId) || row.id === configId));
    },
    async delete(platformId, providerId) {
        await aiProviderRepo().delete({
            platformId,
            id: providerId,
        });
    },
    async recordKeyObservation({ platformId, providerId, signal }) {
        const status = (0, core_utils_1.classifyProviderOutcome)(signal);
        if (status === 'no_change') {
            return;
        }
        const aiProvider = await aiProviderRepo().findOneBy({ id: providerId, platformId });
        if ((0, core_utils_1.isNil)(aiProvider)) {
            return;
        }
        const demotesHealthyKey = status !== 'active' && aiProvider.status === 'active';
        if (!demotesHealthyKey || aiProvider.provider === core_utils_1.AIProviderName.ACTIVEPIECES) {
            await (0, ai_provider_health_1.aiProviderHealth)(log).record({ platformId, providerId, signal });
            return;
        }
        await redis_connections_1.distributedStore.runOnceWithin((0, keys_1.getAiProviderConfirmKey)(providerId), CONFIRM_MIN_INTERVAL_SECONDS, () => this.recheck({ platformId, providerId, expectVersion: aiProvider.statusVersion }));
    },
    async recheck({ platformId, providerId, expectVersion }) {
        const aiProvider = await getRowByIdOrThrow({ platformId, configId: providerId });
        if (aiProvider.provider === core_utils_1.AIProviderName.ACTIVEPIECES) {
            return aiProvider.status;
        }
        const auth = await decryptRowAuth({ aiProvider, platformId });
        const { error } = await (0, core_utils_1.tryCatch)(() => providers_1.aiProviders[aiProvider.provider].validateConnection(auth, aiProvider.config, log));
        const signal = (0, core_utils_1.isNil)(error) ? { statusCode: 200 } : (0, core_utils_1.toProviderOutcomeSignal)(error);
        const recorded = await (0, ai_provider_health_1.aiProviderHealth)(log).record({ platformId, providerId, signal, throttled: false, ...(0, core_utils_1.spreadIfNotUndefined)('expectVersion', expectVersion) });
        return recorded ?? aiProvider.status;
    },
    async validateProviderCredentials(provider, auth, config) {
        const providerStrategy = providers_1.aiProviders[provider];
        try {
            await providerStrategy.validateConnection(auth, config, log);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const configProblem = ownConfigProblem(error);
            const includeHttpErrorInMessage = provider === core_utils_1.AIProviderName.CLOUDFLARE_GATEWAY;
            log.error({ error }, '[aiProviderService#validateProviderCredentials] Failed to validate provider credentials');
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.INVALID_AI_PROVIDER_CREDENTIALS,
                params: {
                    provider,
                    message: !(0, core_utils_1.isNil)(configProblem)
                        ? configProblem
                        : includeHttpErrorInMessage
                            ? `Failed to validate credentials for ${providerStrategy.name}, ${errorMessage}`
                            : `Failed to validate credentials for ${providerStrategy.name}`,
                    httpErrorResponse: errorMessage,
                },
            });
        }
    },
    async getConfigOrThrow({ platformId, provider, scope, configId }) {
        const aiProvider = await resolveRowForScope({ platformId, provider, scope, configId });
        const auth = await decryptRowAuth({ aiProvider, platformId });
        return { ...(0, shared_1.aiProviderCredentials)({ provider: aiProvider.provider, auth, config: aiProvider.config }), configId: aiProvider.id, platformId, modelScope: aiProvider.modelScope, modelIds: aiProvider.modelIds };
    },
    async getOrCreateActivePiecesProviderAuthConfig(platformId) {
        await ensureManagedProviderRow({ platformId });
        const { auth } = await this.getConfigOrThrow({ platformId, provider: core_utils_1.AIProviderName.ACTIVEPIECES, scope: { type: 'platform' } });
        return auth;
    },
});
exports.aiProviderService = aiProviderService;
async function shouldHideActivepiecesAiProvider({ platformId, log }) {
    const { plan } = await (0, platform_service_1.platformService)(log).getOneWithPlanOrThrow(platformId);
    return plan.embeddingEnabled;
}
const PROJECT_SCOPE_SPECIFICITY = {
    selected: 0,
    except: 1,
    all: 2,
};
function rowAllowsScope({ row, scope }) {
    if (scope.type === 'platform') {
        return true;
    }
    switch (row.projectScope) {
        case 'selected':
            return row.projectIds.includes(scope.projectId);
        case 'except':
            return !row.projectIds.includes(scope.projectId);
        default:
            return true;
    }
}
function rankRows(rows) {
    return [...rows].sort((a, b) => {
        const specificityDelta = PROJECT_SCOPE_SPECIFICITY[a.projectScope] - PROJECT_SCOPE_SPECIFICITY[b.projectScope];
        if (specificityDelta !== 0) {
            return specificityDelta;
        }
        return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
}
function provedHealthy() {
    return { status: 'active', statusReason: null, statusUpdated: () => 'now()', statusVersion: () => '"statusVersion" + 1' };
}
function toConfigResponse({ row, enabledForChat }) {
    return {
        id: row.id,
        name: row.displayName,
        provider: row.provider,
        config: row.config,
        enabledForChat,
        modelScope: row.modelScope,
        modelIds: row.modelIds,
        projectScope: row.projectScope,
        projectIds: row.projectIds,
        status: row.status,
        statusReason: row.statusReason,
        statusUpdated: row.statusUpdated,
    };
}
function getDefaultOpenRouterKey() {
    return process.env.AP_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || process.env.AP_OPENROUTER_KEY || '';
}
async function ensureManagedProviderRow({ platformId }) {
    const defaultKey = getDefaultOpenRouterKey();
    const existing = await aiProviderRepo().findOneBy({ platformId, provider: core_utils_1.AIProviderName.ACTIVEPIECES });
    if (!existing) {
        await aiProviderRepo().createQueryBuilder()
            .insert()
            .values({
            id: (0, core_utils_1.apId)(),
            auth: await encryption_1.encryptUtils.encryptObject({ apiKey: defaultKey, apiKeyHash: '' }),
            config: {},
            provider: core_utils_1.AIProviderName.ACTIVEPIECES,
            displayName: 'Anticeil AI',
            platformId,
            modelScope: 'all',
            modelIds: [],
            projectScope: 'all',
            projectIds: [],
            enabledForChat: true,
            status: 'active',
            statusReason: null,
            statusUpdated: new Date().toISOString(),
        })
            .orIgnore()
            .execute();
    } else if (defaultKey) {
        try {
            const auth = await encryption_1.encryptUtils.decryptObject(existing.auth);
            if (!auth?.apiKey || auth.apiKey === '') {
                await aiProviderRepo().update(existing.id, {
                    auth: await encryption_1.encryptUtils.encryptObject({ apiKey: defaultKey, apiKeyHash: '' }),
                    displayName: 'Anticeil AI',
                    enabledForChat: true,
                    status: 'active',
                });
            }
        } catch (e) {
            await aiProviderRepo().update(existing.id, {
                auth: await encryption_1.encryptUtils.encryptObject({ apiKey: defaultKey, apiKeyHash: '' }),
                displayName: 'Anticeil AI',
                enabledForChat: true,
                status: 'active',
            });
        }
    }
}
async function listVisibleRows({ platformId, log }) {
    await ensureManagedProviderRow({ platformId });
    const rows = await aiProviderRepo().findBy({ platformId });
    const hasActivepiecesRow = rows.some((row) => row.provider === core_utils_1.AIProviderName.ACTIVEPIECES);
    const hideActivepieces = hasActivepiecesRow && await isActivepiecesAiProviderHidden({ platformId, log });
    return rows.filter((row) => !(hideActivepieces && row.provider === core_utils_1.AIProviderName.ACTIVEPIECES));
}
async function findRunKeyCandidates({ platformId, provider, configId, scope, log }) {
    if (!(0, core_utils_1.isNil)(configId)) {
        const pinnedRow = await aiProviderRepo().findOneBy({ id: configId, platformId });
        return (0, core_utils_1.isNil)(pinnedRow) ? [] : [pinnedRow];
    }
    const chatRow = await findAvailableChatProviderRow({ platformId, scope, log });
    const namedRow = (0, core_utils_1.isNil)(provider) ? null : await findEligibleRow({ platformId, provider, scope });
    return [chatRow, namedRow].reduce((acc, row) => ((0, core_utils_1.isNil)(row) || acc.some((seen) => seen.id === row.id) ? acc : [...acc, row]), []);
}
async function findEligibleRow({ platformId, provider, scope }) {
    if (provider === core_utils_1.AIProviderName.ACTIVEPIECES) {
        await ensureManagedProviderRow({ platformId });
    }
    const rows = await aiProviderRepo().findBy({ platformId, provider });
    const eligible = rows.filter((row) => rowAllowsScope({ row, scope }));
    return rankRows(eligible)[0] ?? null;
}
async function resolveEligibleRow({ platformId, provider, scope }) {
    const winner = await findEligibleRow({ platformId, provider, scope });
    if ((0, core_utils_1.isNil)(winner)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
            params: {
                entityId: provider,
                entityType: shared_1.AI_PROVIDER_ENTITY_TYPES.provider,
            },
        }, scope.type === 'platform'
            ? `the ${provider} AI provider is not configured on this platform`
            : `no ${provider} AI provider key is available to this project`);
    }
    return winner;
}
async function resolveRowForScope({ platformId, provider, scope, configId }) {
    if ((0, core_utils_1.isNil)(configId)) {
        return resolveEligibleRow({ platformId, provider, scope });
    }
    const rows = await aiProviderRepo().findBy({ platformId, provider });
    const row = rows.find((candidate) => candidate.id === configId && rowAllowsScope({ row: candidate, scope }));
    if ((0, core_utils_1.isNil)(row)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
            params: {
                entityId: configId,
                entityType: shared_1.AI_PROVIDER_ENTITY_TYPES.provider,
            },
        }, scope.type === 'platform'
            ? `the ${provider} AI provider key is not configured on this platform`
            : `the ${provider} AI provider key is not available to this project`);
    }
    return row;
}
async function assertDisplayNameIsFree({ platformId, provider, displayName, exceptId }) {
    if (provider === core_utils_1.AIProviderName.ACTIVEPIECES) {
        return;
    }
    const rows = await aiProviderRepo().findBy({ platformId, provider });
    const taken = rows.some((row) => row.id !== exceptId && row.displayName.trim().toLowerCase() === displayName.trim().toLowerCase());
    if (taken) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.VALIDATION,
            params: { message: 'Another key of this provider already uses this name' },
        });
    }
}
async function getRowByIdOrThrow({ platformId, configId }) {
    const aiProvider = await aiProviderRepo().findOneBy({ id: configId, platformId });
    if ((0, core_utils_1.isNil)(aiProvider)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
            params: {
                entityId: configId,
                entityType: shared_1.AI_PROVIDER_ENTITY_TYPES.provider,
            },
        });
    }
    return aiProvider;
}
async function fetchModels({ aiProvider, platformId, log }) {
    const { provider, config } = aiProvider;
    const auth = await decryptRowAuth({ aiProvider, platformId });
    const cacheKey = getModelsCacheKey({ provider, auth, config });
    if (!modelsCache.has(cacheKey) || 'models' in config) {
        const { data, error } = await (0, core_utils_1.tryCatch)(() => providers_1.aiProviders[provider].listModels(auth, config));
        if (!(0, core_utils_1.isNil)(error) || (0, core_utils_1.isNil)(data)) {
            await (0, exports.aiProviderService)(log).recordKeyObservation({ platformId, providerId: aiProvider.id, signal: (0, core_utils_1.toProviderOutcomeSignal)(error) });
            throw error;
        }
        const catalog = await server_utils_1.modelCatalog.load();
        modelsCache.set(cacheKey, data.map(model => ({
            id: model.id,
            name: model.name,
            type: model.type,
            ...(0, core_utils_1.spreadIfDefined)('metadata', catalog.lookup({ provider, modelId: model.id })),
        })));
    }
    return modelsCache.get(cacheKey);
}
async function decryptRowAuth({ aiProvider, platformId }) {
    const defaultKey = getDefaultOpenRouterKey();
    if (aiProvider.provider === core_utils_1.AIProviderName.ACTIVEPIECES && defaultKey) {
        return { apiKey: defaultKey, apiKeyHash: '' };
    }
    let auth = {};
    try {
        auth = await encryption_1.encryptUtils.decryptObject(aiProvider.auth);
    } catch (e) {
        // fallback
    }
    if (aiProvider.provider === core_utils_1.AIProviderName.ACTIVEPIECES) {
        const doesHaveKeys = !(0, core_utils_1.isNil)(auth) && 'apiKey' in auth && !(0, core_utils_1.isNil)(auth.apiKey) && auth.apiKey !== '';
        if (!doesHaveKeys) {
            if (defaultKey) {
                return { apiKey: defaultKey, apiKeyHash: '' };
            }
            return enrichWithKeysIfNeeded(aiProvider, platformId);
        }
    }
    return auth;
}
async function findAvailableChatProviderRow({ platformId, scope, log }) {
    await ensureManagedProviderRow({ platformId });
    const candidates = await aiProviderRepo().findBy([
        { platformId, enabledForChat: true },
        { platformId, provider: core_utils_1.AIProviderName.ACTIVEPIECES },
    ]);
    const rows = candidates.filter((row) => rowAllowsScope({ row, scope }));
    const chatRow = pickChatRow(rows);
    return chatRow;
}
function pickChatRow(rows) {
    return rows.find((row) => row.enabledForChat)
        ?? rows.find((row) => row.provider === core_utils_1.AIProviderName.ACTIVEPIECES)
        ?? null;
}
async function isActivepiecesAiProviderHidden({ platformId, log }) {
    const defaultKey = getDefaultOpenRouterKey();
    if (defaultKey) {
        return false;
    }
    if (!(0, flag_service_1.flagService)(log).aiCreditsEnabled()) {
        return true;
    }
    return shouldHideActivepiecesAiProvider({ platformId, log });
}
async function enrichWithKeysIfNeeded(aiProvider, platformId) {
    const defaultKey = getDefaultOpenRouterKey();
    if (defaultKey) {
        return { apiKey: defaultKey, apiKeyHash: '' };
    }
    const { key, data } = await openrouter_api_1.openRouterApi.createKey({
        name: `Platform ${platformId}`,
        limit: MANAGED_OPENROUTER_KEY_MONTHLY_LIMIT_USD,
        limit_reset: MANAGED_OPENROUTER_KEY_LIMIT_RESET,
    });
    const rawAuth = { apiKey: key, apiKeyHash: data.hash };
    await aiProviderRepo().save({
        id: aiProvider.id,
        platformId,
        provider: core_utils_1.AIProviderName.ACTIVEPIECES,
        displayName: 'Anticeil AI',
        config: {},
        auth: await encryption_1.encryptUtils.encryptObject(rawAuth),
    });
    return rawAuth;
}
function ownConfigProblem(error) {
    if (!(error instanceof core_utils_1.ActivepiecesError) || error.error.code !== core_utils_1.ErrorCode.VALIDATION) {
        return undefined;
    }
    const { message } = error.error.params;
    return typeof message === 'string' ? message : undefined;
}
function getModelsCacheKey({ provider, auth, config }) {
    return `${provider}-${JSON.stringify(auth)}-${JSON.stringify(config)}`;
}
//# sourceMappingURL=ai-provider-service.js.map