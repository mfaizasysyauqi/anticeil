"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentModule = void 0;
const agent_controller_1 = require("./agent-controller");
const agent_conversation_controller_1 = require("./agent-conversation-controller");
const chat_visibility_helper_1 = require("./chat-visibility-helper");
const chat_personalization_controller_1 = require("./personalization/chat-personalization-controller");

const agentModule = async (app) => {
    await app.register(async (chatSurface) => {
        chatSurface.addHook('preHandler', chat_visibility_helper_1.chatVisibilityGuard);
        await chatSurface.register(agent_conversation_controller_1.agentConversationController, { prefix: '/v1/agents' });
        await chatSurface.register(chat_personalization_controller_1.chatPersonalizationController, { prefix: '/v1/agents/personalization' });
    });
    await app.register(async (agentSurface) => {
        // Anticeil: Agents are unlocked for all plans, including Free plan
        await agentSurface.register(agent_controller_1.agentController, { prefix: '/v1/agents' });
    });
};
exports.agentModule = agentModule;
