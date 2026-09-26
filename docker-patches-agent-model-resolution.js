"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAST_TIER_ID = exports.agentModelResolution = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");

function getOpenRouterModelForTier(tierId) {
    if (process.env.AP_OPENROUTER_MODEL) {
        return process.env.AP_OPENROUTER_MODEL;
    }
    switch (tierId) {
        case 'fast':
            return process.env.AP_OPENROUTER_FAST_MODEL || 'openrouter/free';
        case 'smart':
        case 'expert':
            return process.env.AP_OPENROUTER_SMART_MODEL || process.env.AP_OPENROUTER_EXPERT_MODEL || 'openrouter/free';
        case 'premium':
        case 'heavy':
            return process.env.AP_OPENROUTER_PREMIUM_MODEL || process.env.AP_OPENROUTER_HEAVY_MODEL || 'openrouter/free';
        default:
            return process.env.AP_OPENROUTER_SMART_MODEL || 'openrouter/free';
    }
}

function findTier({ tierId }) {
    return shared_1.ACTIVEPIECES_CHAT_TIERS.find((t) => t.id === tierId);
}
function resolveTier({ tierId }) {
    return findTier({ tierId }) ?? findTier({ tierId: shared_1.DEFAULT_CHAT_TIER_ID }) ?? shared_1.ACTIVEPIECES_CHAT_TIERS[0];
}
function manualTextModelCatalog({ config }) {
    if ((0, core_utils_1.isNil)(config) || !('models' in config) || (0, core_utils_1.isNil)(config.models)) {
        return undefined;
    }
    return config.models.filter((model) => model.modelType === shared_1.AIProviderModelType.TEXT).map((model) => model.modelId);
}
function pickAllowedModel({ provider, selectedModel, candidates, modelScope, modelIds }) {
    const allowed = modelScope === 'selected' && !(0, core_utils_1.isNil)(modelIds)
        ? candidates.filter((candidate) => modelIds.includes(candidate))
        : candidates;
    if (allowed.length === 0) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
            params: { entityId: provider, entityType: shared_1.AI_PROVIDER_ENTITY_TYPES.provider },
        }, 'this AI provider key allows no text model a chat turn can run on');
    }
    return selectedModel && allowed.includes(selectedModel) ? selectedModel : allowed[0];
}
function managedModelCandidates({ modelScope, modelIds }) {
    const managed = shared_1.aiProviderUtils.managedChatModelIds();
    return modelScope === 'selected' && !(0, core_utils_1.isNil)(modelIds) ? managed.filter((id) => modelIds.includes(id)) : managed;
}
function resolveNamedModelId({ provider, modelName, modelScope, modelIds }) {
    if (provider !== core_utils_1.AIProviderName.ACTIVEPIECES && provider !== core_utils_1.AIProviderName.OPENROUTER) {
        return modelName;
    }
    const tier = findTier({ tierId: modelName });
    if (tier) {
        return getOpenRouterModelForTier(tier.id);
    }
    return getOpenRouterModelForTier(modelName);
}
function resolveModelIdForProvider({ provider, selectedModel, config, modelScope, modelIds }) {
    const catalog = manualTextModelCatalog({ config });
    if (!(0, core_utils_1.isNil)(catalog)) {
        return pickAllowedModel({ provider, selectedModel, candidates: catalog, modelScope, modelIds });
    }
    const tier = resolveTier({ tierId: selectedModel });
    if (provider === core_utils_1.AIProviderName.ACTIVEPIECES || provider === core_utils_1.AIProviderName.OPENROUTER) {
        return getOpenRouterModelForTier(tier?.id || selectedModel);
    }
    const candidates = (shared_1.aiProviderUtils.getCuratedChatModels({ provider }) ?? []).map((model) => model.id);
    const preferred = selectedModel && candidates.includes(selectedModel) ? selectedModel : tier.nativeModelId;
    return pickAllowedModel({ provider, selectedModel: preferred, candidates, modelScope, modelIds });
}
function defaultModelIdForProvider({ provider }) {
    const { data } = (0, core_utils_1.tryCatchSync)(() => resolveModelIdForProvider({ provider, selectedModel: shared_1.DEFAULT_CHAT_TIER_ID }));
    return data;
}
function resolveModelIdForAnalytics({ provider, selectedModel }) {
    if ((0, core_utils_1.isNil)(selectedModel)) {
        return null;
    }
    if (!(0, core_utils_1.isNil)(provider)) {
        return resolveModelIdForProvider({ provider, selectedModel });
    }
    const tier = findTier({ tierId: selectedModel });
    if (!(0, core_utils_1.isNil)(tier)) {
        return getOpenRouterModelForTier(tier.id);
    }
    return shared_1.aiProviderUtils.isCuratedChatModelId({ modelId: selectedModel }) ? selectedModel : null;
}
function resolveFastModelId({ provider, config, modelScope, modelIds }) {
    return resolveModelIdForProvider({ provider, selectedModel: 'fast', config, modelScope, modelIds });
}
exports.agentModelResolution = {
    findTier,
    resolveTier,
    resolveNamedModelId,
    resolveModelIdForProvider,
    defaultModelIdForProvider,
    resolveModelIdForAnalytics,
    resolveFastModelId,
};
exports.FAST_TIER_ID = 'fast';
//# sourceMappingURL=agent-model-resolution.js.map
