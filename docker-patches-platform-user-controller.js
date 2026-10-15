"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformUserController = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const http_status_codes_1 = require("http-status-codes");
const zod_1 = require("zod");
const fastify_security_1 = require("../../core/security/authorization/fastify-security");
const system_1 = require("../../helper/system/system");
const platform_service_1 = require("../../platform/platform.service");
const user_service_1 = require("../user-service");
const platformUserController = async (app) => {
    app.get('/', ListUsersRequest, async (req) => {
        const platformId = req.principal.platform.id;
        (0, core_utils_1.assertNotNullOrUndefined)(platformId, 'platformId');
        return (0, user_service_1.userService)(req.log).list({
            platformId,
            externalId: req.query.externalId,
            cursorRequest: req.query.cursor ?? null,
            limit: req.query.limit ?? 10,
        });
    });
    app.post('/:id', UpdateUserRequest, async (req) => {
        const platformId = req.principal.platform.id;
        (0, core_utils_1.assertNotNullOrUndefined)(platformId, 'platformId');
        const platform = await (0, platform_service_1.platformService)(req.log).getOneOrThrow(platformId);
        if (platform.ownerId === req.params.id && req.principal.id !== platform.ownerId) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.AUTHORIZATION,
                params: {
                    message: 'Platform owner role cannot be modified by other admins',
                },
            });
        }
        if (platform.ownerId === req.params.id && req.body.platformRole && req.body.platformRole !== shared_1.PlatformRole.ADMIN) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.VALIDATION,
                params: {
                    message: 'Platform owner must be an Admin',
                },
            });
        }
        return (0, user_service_1.userService)(req.log).update({
            id: req.params.id,
            platformId,
            platformRole: req.body.platformRole,
            status: req.body.status,
            externalId: req.body.externalId,
        });
    });
    app.delete('/:id', DeleteUserRequest, async (req, res) => {
        const platformId = req.principal.platform.id;
        (0, core_utils_1.assertNotNullOrUndefined)(platformId, 'platformId');
        const platform = await (0, platform_service_1.platformService)(req.log).getOneOrThrow(platformId);
        if (platform.ownerId === req.params.id) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.VALIDATION,
                params: {
                    message: 'Platform owner cannot be deleted',
                },
            });
        }
        const edition = system_1.system.getEdition();
        if (edition === shared_1.ApEdition.CLOUD) {
            await (0, user_service_1.userService)(req.log).removeFromPlatform({
                id: req.params.id,
                platformId,
            });
        }
        else {
            await (0, user_service_1.userService)(req.log).delete({
                id: req.params.id,
                platformId,
            });
        }
        return res.status(http_status_codes_1.StatusCodes.NO_CONTENT).send();
    });
};
exports.platformUserController = platformUserController;
const ListUsersRequest = {
    schema: {
        querystring: shared_1.ListUsersRequestBody,
        response: {
            [http_status_codes_1.StatusCodes.OK]: (0, core_utils_1.SeekPage)(shared_1.UserWithMetaInformation),
        },
        tags: ['users'],
        description: 'List users',
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
    },
    response: {
        [http_status_codes_1.StatusCodes.OK]: (0, core_utils_1.SeekPage)(shared_1.UserWithMetaInformation),
    },
    config: {
        security: fastify_security_1.securityAccess.nonEmbedUsersOnly([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE]),
    },
};
const UpdateUserRequest = {
    schema: {
        params: zod_1.z.object({
            id: core_utils_1.ApId,
        }),
        body: shared_1.UpdateUserRequestBody,
        response: {
            [http_status_codes_1.StatusCodes.OK]: shared_1.UserWithMetaInformation,
        },
        tags: ['users'],
        description: 'Update user',
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
    },
    config: {
        security: fastify_security_1.securityAccess.platformAdminOnly([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE]),
    },
};
const DeleteUserRequest = {
    schema: {
        params: zod_1.z.object({
            id: core_utils_1.ApId,
        }),
        tags: ['users'],
        description: 'Delete user',
        response: {
            [http_status_codes_1.StatusCodes.NO_CONTENT]: zod_1.z.never(),
        },
        security: [shared_1.SERVICE_KEY_SECURITY_OPENAPI],
    },
    config: {
        security: fastify_security_1.securityAccess.platformAdminOnly([shared_1.PrincipalType.USER, shared_1.PrincipalType.SERVICE]),
    },
};
//# sourceMappingURL=platform-user-controller.js.map