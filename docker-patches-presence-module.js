"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceModule = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const user_service_1 = require("../../../user/user-service");
const websockets_service_1 = require("../../websockets.service");
const collaborative_resource_1 = require("../collaborative-resource");
const presence_service_1 = require("./presence.service");

// Fallbacks for custom Anticeil realtime websocket events that may not exist in base image's @activepieces/shared
const MOVE_CURSOR_EVENT = (shared_1.WebsocketServerEvent && shared_1.WebsocketServerEvent.MOVE_CURSOR) || 'MOVE_CURSOR';
const CURSOR_UPDATED_EVENT = (shared_1.WebsocketClientEvent && shared_1.WebsocketClientEvent.CURSOR_UPDATED) || 'CURSOR_UPDATED';
const FLOW_UPDATED_EVENT = (shared_1.WebsocketClientEvent && shared_1.WebsocketClientEvent.FLOW_UPDATED) || 'FLOW_UPDATED';

const presenceModule = async (app) => {
    // Hook on Fastify responses: when a flow is updated via HTTP POST /api/v1/flows/:id, broadcast FLOW_UPDATED
    app.addHook('onSend', async (request, reply, payload) => {
        if (request.method === 'POST' && typeof request.url === 'string' && request.url.includes('/flows/') && reply.statusCode < 300) {
            try {
                const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
                if (data && data.id && data.version) {
                    const projectId = request.projectId || (request.principal && request.principal.projectId);
                    if (projectId) {
                        websockets_service_1.websocketService.to(projectId).emit(FLOW_UPDATED_EVENT, {
                            flowId: data.id,
                            version: data.version,
                        });
                    }
                }
            } catch (e) {
                // Ignore parse errors on non-json responses
            }
        }
        return payload;
    });

    websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, shared_1.WebsocketServerEvent.JOIN_PRESENCE, (socket) => {
        return async (data, principal, projectId, callback) => {
            const request = shared_1.PresenceRequest.safeParse(data);
            if (!request.success) {
                callback?.({ users: [] });
                return;
            }
            const { resourceId } = request.data;
            try {
                const resource = await collaborative_resource_1.collaborativeResource.resolve({ resourceId, projectId });
                if ((0, core_utils_1.isNil)(resource)) {
                    app.log.warn({ resourceId, user: { id: principal.id }, project: { id: projectId } }, '[JOIN_PRESENCE] Denied: resource does not belong to this project');
                    callback?.({ users: [] });
                    return;
                }
                const user = await (0, user_service_1.userService)(app.log).getMetaInformation({ id: principal.id });
                const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Collaborator';
                socket.data.userDisplayName = displayName;
                socket.data.userEmail = user.email || '';
                socket.data.userImageUrl = user.imageUrl ?? null;

                await (0, presence_service_1.presenceService)(app.log).join({
                    resourceId,
                    projectId,
                    userId: principal.id,
                    userDisplayName: displayName,
                    userEmail: user.email,
                    userImageUrl: user.imageUrl ?? null,
                });
                socket.data.presenceResourceId = resourceId;
                const users = await (0, presence_service_1.presenceService)(app.log).getActiveUsers({ resourceId, projectId });
                websockets_service_1.websocketService.to(projectId).emit(shared_1.WebsocketClientEvent.PRESENCE_UPDATED, {
                    resourceId,
                    users,
                });
                registerPresenceDisconnectHandler({ socket, userId: principal.id, projectId, app });
                callback?.({ users });
            }
            catch (error) {
                app.log.error({ error }, '[JOIN_PRESENCE] Failed to join presence');
                callback?.({ users: [] });
            }
        };
    });

    websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, shared_1.WebsocketServerEvent.LEAVE_PRESENCE, (socket) => {
        return async (data, principal, projectId) => {
            const request = shared_1.PresenceRequest.safeParse(data);
            if (!request.success) {
                return;
            }
            const { resourceId } = request.data;
            try {
                await (0, presence_service_1.presenceService)(app.log).leave({
                    resourceId,
                    projectId,
                    userId: principal.id,
                });
                socket.data.presenceResourceId = null;
                const users = await (0, presence_service_1.presenceService)(app.log).getActiveUsers({ resourceId, projectId });
                websockets_service_1.websocketService.to(projectId).emit(shared_1.WebsocketClientEvent.PRESENCE_UPDATED, {
                    resourceId,
                    users,
                });
                // Also clear cursor when leaving resource
                socket.to(projectId).emit(CURSOR_UPDATED_EVENT, {
                    resourceId,
                    userId: principal.id,
                    userDisplayName: '',
                    x: null,
                    y: null,
                    socketId: socket.id,
                    clientId: socket.data.clientId ?? socket.id,
                });
            }
            catch (error) {
                app.log.error({ error }, '[LEAVE_PRESENCE] Failed to leave presence');
            }
        };
    });

    // Realtime cursor movement listener
    websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, MOVE_CURSOR_EVENT, (socket) => {
        return async (data, principal, projectId) => {
            if (!data || typeof data !== 'object') {
                return;
            }
            const { resourceId, x, y, selectedStep, clientId } = data;
            if (!resourceId) {
                return;
            }
            try {
                if (!socket.data.userDisplayName) {
                    try {
                        const user = await (0, user_service_1.userService)(app.log).getMetaInformation({ id: principal.id });
                        socket.data.userDisplayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Collaborator';
                        socket.data.userEmail = user.email || '';
                        socket.data.userImageUrl = user.imageUrl ?? null;
                    } catch (e) {
                        socket.data.userDisplayName = 'Collaborator';
                    }
                }
                if (clientId) {
                    socket.data.clientId = clientId;
                }
                socket.data.presenceResourceId = resourceId;
                const displayName = socket.data.userDisplayName || 'Collaborator';

                // Broadcast cursor position and selected step to other collaborators in the project room
                socket.to(projectId).emit(CURSOR_UPDATED_EVENT, {
                    resourceId,
                    userId: principal.id,
                    userDisplayName: displayName,
                    userEmail: socket.data.userEmail,
                    userImageUrl: socket.data.userImageUrl,
                    x: typeof x === 'number' ? x : null,
                    y: typeof y === 'number' ? y : null,
                    selectedStep: selectedStep ?? null,
                    socketId: socket.id,
                    clientId: clientId ?? socket.id,
                });
            }
            catch (error) {
                app.log.error({ error }, '[MOVE_CURSOR] Failed to broadcast cursor');
            }
        };
    });

    // Realtime workflow modification broadcast listener
    websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, FLOW_UPDATED_EVENT, (socket) => {
        return async (data, principal, projectId) => {
            if (!data || typeof data !== 'object') {
                return;
            }
            try {
                // Forward the updated flow version to all other open tabs/collaborators in this project
                socket.to(projectId).emit(FLOW_UPDATED_EVENT, data);
            }
            catch (error) {
                app.log.error({ error }, '[FLOW_UPDATED] Failed to broadcast flow update');
            }
        };
    });
};
exports.presenceModule = presenceModule;

function registerPresenceDisconnectHandler({ socket, userId, projectId, app }) {
    if (socket.data.presenceDisconnectRegistered) {
        return;
    }
    socket.data.presenceDisconnectRegistered = true;
    socket.once('disconnect', async () => {
        const presenceResourceId = socket.data.presenceResourceId;
        if (typeof presenceResourceId === 'string') {
            try {
                await (0, presence_service_1.presenceService)(app.log).leave({
                    resourceId: presenceResourceId,
                    projectId,
                    userId,
                });
                const users = await (0, presence_service_1.presenceService)(app.log).getActiveUsers({ resourceId: presenceResourceId, projectId });
                websockets_service_1.websocketService.to(projectId).emit(shared_1.WebsocketClientEvent.PRESENCE_UPDATED, {
                    resourceId: presenceResourceId,
                    users,
                });
            } catch (err) {
                // Ignore disconnect errors
            }

            // Clear cursor position for disconnected user
            websockets_service_1.websocketService.to(projectId).emit(CURSOR_UPDATED_EVENT, {
                resourceId: presenceResourceId,
                userId,
                userDisplayName: '',
                x: null,
                y: null,
                socketId: socket.id,
                clientId: socket.data.clientId ?? socket.id,
            });
        }
    });
}
