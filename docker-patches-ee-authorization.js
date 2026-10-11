"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformToEditMustBeOwnedByCurrentUser = exports.platformMustBeOwnedByCurrentUser = exports.projectMustBeTeamType = exports.platformMustHaveFeatureEnabled = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const authorization_middleware_1 = require("../core/security/v2/authz/authorization-middleware");
const project_service_1 = require("../project/project-service");
const platform_service_1 = require("../platform/platform.service");

const platformMustHaveFeatureEnabled = (handler) => async (request, _res) => {
    const platformId = 'platform' in request.principal ? request.principal.platform.id : null;
    if ((0, core_utils_1.isNil)(platformId)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'Platform ID is required',
            },
        });
    }
    const platform = await (0, platform_service_1.platformService)(request.log).getOneWithPlanOrThrow(platformId);
    const enabled = handler(platform);
    if (!enabled) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.FEATURE_DISABLED,
            params: {
                message: 'Feature is disabled for current plan',
            },
        });
    }
};
exports.platformMustHaveFeatureEnabled = platformMustHaveFeatureEnabled;

const checkIfPlatformIsOwnedByUser = async (platformId, request) => {
    if ((0, core_utils_1.isNil)(platformId)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'Platform ID is required',
            },
        });
    }
    const isApiKey = request.principal.type === shared_1.PrincipalType.SERVICE;
    if (isApiKey) {
        return;
    }
    const user = await (0, user_service_1.userService)(request.log).getOneOrFail({
        id: request.principal.id,
    });
    if ((0, core_utils_1.isNil)(user)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'User is not found',
            },
        });
    }
    const canEditPlatform = user.platformRole === shared_1.PlatformRole.ADMIN && user.platformId === platformId;
    if (!canEditPlatform) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'User is not owner of the platform',
            },
        });
    }
};

const projectMustBeTeamType = async (request, _res) => {
    if (request.principal.type !== shared_1.PrincipalType.USER && request.principal.type !== shared_1.PrincipalType.SERVICE) {
        return;
    }
    const projectId = await (0, authorization_middleware_1.getProjectIdFromRequest)(request);
    if ((0, core_utils_1.isNil)(projectId)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'Project ID is required',
            },
        });
    }
    const project = await (0, project_service_1.projectService)(request.log).getOneOrThrow(projectId);
    if (project.type !== shared_1.ProjectType.TEAM) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.VALIDATION,
            params: {
                message: 'Project must be a team project',
            },
        });
    }
};
exports.projectMustBeTeamType = projectMustBeTeamType;

const platformMustBeOwnedByCurrentUser = async (request, _res) => {
    const principal = request.principal;
    if (principal.type !== shared_1.PrincipalType.USER && principal.type !== shared_1.PrincipalType.SERVICE) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'You are unauthenticated and cannot access this resource',
            },
        });
    }
    const platformId = principal.platform.id;
    await checkIfPlatformIsOwnedByUser(platformId, request);
};
exports.platformMustBeOwnedByCurrentUser = platformMustBeOwnedByCurrentUser;

const platformToEditMustBeOwnedByCurrentUser = async (request, _res) => {
    if (!request.params || typeof request.params !== 'object' || !('id' in request.params) || typeof request.params.id !== 'string') {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'Platform ID is required',
            },
        });
    }
    await checkIfPlatformIsOwnedByUser(request.params.id, request);
};
exports.platformToEditMustBeOwnedByCurrentUser = platformToEditMustBeOwnedByCurrentUser;
