"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceModule = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const user_service_1 = require("../../../user/user-service");
let project_service_1, platform_plan_service_1;
try { project_service_1 = require("../../../project/project-service"); } catch(e) { try { project_service_1 = require("../../../ee/projects/platform-project-service"); } catch(e2) { project_service_1 = null; } }
try { platform_plan_service_1 = require("../../../billing/platform-plan.service"); } catch(e) { try { platform_plan_service_1 = require("../../../ee/platform/platform-plan/platform-plan.service"); } catch(e2) { platform_plan_service_1 = null; } }
const websockets_service_1 = require("../../websockets.service");
const collaborative_resource_1 = require("../collaborative-resource");
const presence_service_1 = require("./presence.service");
const presenceModule = async (app) => {
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
                const displayName = `${user.firstName} ${user.lastName}`;
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
                socket.to(projectId).emit(shared_1.WebsocketClientEvent.CURSOR_UPDATED, {
                    resourceId,
                    userId: principal.id,
                    userDisplayName: '',
                    x: null,
                    y: null,
                });
            }
            catch (error) {
                app.log.error({ error }, '[LEAVE_PRESENCE] Failed to leave presence');
            }
        };
    });
    websockets_service_1.websocketService.addListener(shared_1.PrincipalType.USER, shared_1.WebsocketServerEvent.MOVE_CURSOR, (socket) => {
        return async (data, principal, projectId) => {
            const request = shared_1.CursorMoveRequest.safeParse(data);
            if (!request.success) {
                return;
            }
            const { resourceId, x, y, selectedStep, clientId } = request.data;
            try {
                // Ensure project's platform is on Plan Plus or above
                if (project_service_1 && platform_plan_service_1) {
                    const project = await (0, project_service_1.projectService)(app.log).getOneOrThrow(projectId);
                    const platformPlan = await (0, platform_plan_service_1.platformPlanService)(app.log).getOrCreateForPlatform(project.platformId);
                    const isPlanPlusOrAbove = platformPlan.plan && platformPlan.plan !== 'free' && platformPlan.plan !== 'free_legacy';
                    if (!isPlanPlusOrAbove) {
                        return;
                    }
                }
                const user = await (0, user_service_1.userService)(app.log).getMetaInformation({ id: principal.id });
                const displayName = `${user.firstName} ${user.lastName}`;
                if (clientId) {
                    socket.data.clientId = clientId;
                }
                // Broadcast cursor position and selected step to other collaborators in the project room
                socket.to(projectId).emit(shared_1.WebsocketClientEvent.CURSOR_UPDATED, {
                    resourceId,
                    userId: principal.id,
                    userDisplayName: displayName,
                    userEmail: user.email,
                    userImageUrl: user.imageUrl ?? null,
                    x,
                    y,
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
            // Clear cursor position for disconnected user
            websockets_service_1.websocketService.to(projectId).emit(shared_1.WebsocketClientEvent.CURSOR_UPDATED, {
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
