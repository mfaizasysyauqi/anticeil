import { isNil } from '@activepieces/core-utils'
import { CursorMoveRequest, PresenceRequest, PrincipalType, WebsocketClientEvent, WebsocketServerEvent } from '@activepieces/shared'
import { FastifyInstance } from 'fastify'
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { userService } from '../../../user/user-service'
import { projectService } from '../../../project/project-service'
import { platformPlanService } from '../../../billing/platform-plan.service'
import { websocketService } from '../../websockets.service'
import { collaborativeResource } from '../collaborative-resource'
import { presenceService } from './presence.service'

export const presenceModule: FastifyPluginAsyncZod = async (app) => {
    websocketService.addListener(PrincipalType.USER, WebsocketServerEvent.JOIN_PRESENCE, (socket) => {
        return async (data: unknown, principal, projectId, callback) => {
            const request = PresenceRequest.safeParse(data)
            if (!request.success) {
                callback?.({ users: [] })
                return
            }
            const { resourceId } = request.data
            try {
                const resource = await collaborativeResource.resolve({ resourceId, projectId })
                if (isNil(resource)) {
                    app.log.warn({ resourceId, user: { id: principal.id }, project: { id: projectId } }, '[JOIN_PRESENCE] Denied: resource does not belong to this project')
                    callback?.({ users: [] })
                    return
                }

                const user = await userService(app.log).getMetaInformation({ id: principal.id })
                const displayName = `${user.firstName} ${user.lastName}`

                await presenceService(app.log).join({
                    resourceId,
                    projectId,
                    userId: principal.id,
                    userDisplayName: displayName,
                    userEmail: user.email,
                    userImageUrl: user.imageUrl ?? null,
                })
                socket.data.presenceResourceId = resourceId

                const users = await presenceService(app.log).getActiveUsers({ resourceId, projectId })
                websocketService.to(projectId).emit(WebsocketClientEvent.PRESENCE_UPDATED, {
                    resourceId,
                    users,
                })

                registerPresenceDisconnectHandler({ socket, userId: principal.id, projectId, app })

                callback?.({ users })
            }
            catch (error) {
                app.log.error({ error }, '[JOIN_PRESENCE] Failed to join presence')
                callback?.({ users: [] })
            }
        }
    })
    websocketService.addListener(PrincipalType.USER, WebsocketServerEvent.LEAVE_PRESENCE, (socket) => {
        return async (data: unknown, principal, projectId) => {
            const request = PresenceRequest.safeParse(data)
            if (!request.success) {
                return
            }
            const { resourceId } = request.data
            try {
                await presenceService(app.log).leave({
                    resourceId,
                    projectId,
                    userId: principal.id,
                })
                socket.data.presenceResourceId = null

                const users = await presenceService(app.log).getActiveUsers({ resourceId, projectId })
                websocketService.to(projectId).emit(WebsocketClientEvent.PRESENCE_UPDATED, {
                    resourceId,
                    users,
                })

                // Also clear cursor when leaving resource
                socket.to(projectId).emit(WebsocketClientEvent.CURSOR_UPDATED, {
                    resourceId,
                    userId: principal.id,
                    userDisplayName: '',
                    x: null,
                    y: null,
                })
            }
            catch (error) {
                app.log.error({ error }, '[LEAVE_PRESENCE] Failed to leave presence')
            }
        }
    })

    websocketService.addListener(PrincipalType.USER, WebsocketServerEvent.MOVE_CURSOR, (socket) => {
        return async (data: unknown, principal, projectId) => {
            const request = CursorMoveRequest.safeParse(data)
            if (!request.success) {
                return
            }
            const { resourceId, x, y, selectedStep, clientId } = request.data
            try {
                // Ensure project's platform is on Plan Plus or above
                const project = await projectService(app.log).getOneOrThrow(projectId)
                const platformPlan = await platformPlanService(app.log).getOrCreateForPlatform(project.platformId)
                const isPlanPlusOrAbove = platformPlan.plan && platformPlan.plan !== 'free' && platformPlan.plan !== 'free_legacy'
                if (!isPlanPlusOrAbove) {
                    return
                }

                const user = await userService(app.log).getMetaInformation({ id: principal.id })
                const displayName = `${user.firstName} ${user.lastName}`

                if (clientId) {
                    socket.data.clientId = clientId
                }

                // Broadcast cursor position and selected step to other collaborators in the project room
                socket.to(projectId).emit(WebsocketClientEvent.CURSOR_UPDATED, {
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
                })
            }
            catch (error) {
                app.log.error({ error }, '[MOVE_CURSOR] Failed to broadcast cursor')
            }
        }
    })
}

function registerPresenceDisconnectHandler({ socket, userId, projectId, app }: RegisterDisconnectHandlerParams): void {
    if (socket.data.presenceDisconnectRegistered) {
        return
    }
    socket.data.presenceDisconnectRegistered = true
    socket.once('disconnect', async () => {
        const presenceResourceId = socket.data.presenceResourceId
        if (typeof presenceResourceId === 'string') {
            await presenceService(app.log).leave({
                resourceId: presenceResourceId,
                projectId,
                userId,
            })
            const users = await presenceService(app.log).getActiveUsers({ resourceId: presenceResourceId, projectId })
            websocketService.to(projectId).emit(WebsocketClientEvent.PRESENCE_UPDATED, {
                resourceId: presenceResourceId,
                users,
            })
            // Clear cursor position for disconnected user
            websocketService.to(projectId).emit(WebsocketClientEvent.CURSOR_UPDATED, {
                resourceId: presenceResourceId,
                userId,
                userDisplayName: '',
                x: null,
                y: null,
                socketId: socket.id,
                clientId: (socket.data.clientId as string | undefined) ?? socket.id,
            })
        }
    })
}

type RegisterDisconnectHandlerParams = {
    socket: { data: Record<string, unknown>, once: (event: string, handler: () => void) => void, id: string }
    userId: string
    projectId: string
    app: FastifyInstance
}
