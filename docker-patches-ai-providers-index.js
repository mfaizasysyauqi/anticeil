"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProviders = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const anthropic_provider_1 = require("./anthropic-provider");
const azure_provider_1 = require("./azure-provider");
const bedrock_provider_1 = require("./bedrock-provider");
const cloudflare_gateway_provider_1 = require("./cloudflare-gateway-provider");
const google_provider_1 = require("./google-provider");
const mistral_provider_1 = require("./mistral-provider");
const openai_compatible_gateway_provider_1 = require("./openai-compatible-gateway-provider");
const openai_compatible_vendor_1 = require("./openai-compatible-vendor");
const openai_provider_1 = require("./openai-provider");
const openrouter_provider_1 = require("./openrouter-provider");
const vertex_provider_1 = require("./vertex-provider");
exports.aiProviders = {
    [core_utils_1.AIProviderName.OPENAI]: openai_provider_1.openaiProvider,
    [core_utils_1.AIProviderName.ANTHROPIC]: anthropic_provider_1.anthropicProvider,
    [core_utils_1.AIProviderName.OPENROUTER]: openrouter_provider_1.openRouterProvider,
    [core_utils_1.AIProviderName.AZURE]: azure_provider_1.azureProvider,
    [core_utils_1.AIProviderName.GOOGLE]: google_provider_1.googleProvider,
    [core_utils_1.AIProviderName.CLOUDFLARE_GATEWAY]: cloudflare_gateway_provider_1.cloudflareGatewayProvider,
    [core_utils_1.AIProviderName.CUSTOM]: openai_compatible_gateway_provider_1.openAICompatibleProvider,
    [core_utils_1.AIProviderName.BEDROCK]: bedrock_provider_1.bedrockProvider,
    [core_utils_1.AIProviderName.VERTEX]: vertex_provider_1.vertexProvider,
    [core_utils_1.AIProviderName.MISTRAL]: mistral_provider_1.mistralProvider,
    [core_utils_1.AIProviderName.XAI]: (0, openai_compatible_vendor_1.openAiCompatibleVendor)({ name: 'xAI', provider: core_utils_1.AIProviderName.XAI }),
    [core_utils_1.AIProviderName.DEEPSEEK]: (0, openai_compatible_vendor_1.openAiCompatibleVendor)({ name: 'DeepSeek', provider: core_utils_1.AIProviderName.DEEPSEEK }),
    [core_utils_1.AIProviderName.ZAI]: (0, openai_compatible_vendor_1.openAiCompatibleVendor)({ name: 'Z.ai', provider: core_utils_1.AIProviderName.ZAI }),
    [core_utils_1.AIProviderName.QWEN]: (0, openai_compatible_vendor_1.openAiCompatibleVendor)({ name: 'Qwen', provider: core_utils_1.AIProviderName.QWEN }),
    [core_utils_1.AIProviderName.MINIMAX]: (0, openai_compatible_vendor_1.openAiCompatibleVendor)({ name: 'MiniMax', provider: core_utils_1.AIProviderName.MINIMAX }),
    [core_utils_1.AIProviderName.MOONSHOT]: (0, openai_compatible_vendor_1.openAiCompatibleVendor)({ name: 'Moonshot AI', provider: core_utils_1.AIProviderName.MOONSHOT }),
    [core_utils_1.AIProviderName.ACTIVEPIECES]: {
        ...openrouter_provider_1.openRouterProvider,
        name: 'Anticeil',
        async validateConnection(_authConfig, _config, _log) {
            // Anticeil provider is managed internally, no external validation needed
        },
    },
};
//# sourceMappingURL=index.js.map