"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeOrThrow = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const user_identity_service_1 = require("../../../../authentication/user-identity/user-identity-service");
const rbac_service_1 = require("../../../../ee/authentication/project-role/rbac-service");
const project_member_service_1 = require("../../../../ee/projects/project-members/project-member.service");
const system_1 = require("../../../../helper/system/system");
const platform_service_1 = require("../../../../platform/platform.service");
const user_service_1 = require("../../../../user/user-service");
const common_1 = require("../../authorization/common");
const authorizeOrThrow = async (principal, security, log) => {
    if (security.kind === common_1.RouteKind.PUBLIC) {
        return;
    }
    switch (security.authorization.type) {
        case common_1.AuthorizationType.PROJECT:
            await assertPrinicpalIsOneOf(security.authorization.allowedPrincipals, principal.type);
            await assertAccessToProject(principal, security.authorization, log);
            break;
        case common_1.AuthorizationType.PLATFORM:
            await assertPrinicpalIsOneOf(security.authorization.allowedPrincipals, principal.type);
            if (security.authorization.adminOnly) {
                await assertPlatformIsOwnedByCurrentPrincipal(principal, log);
            }
            if (security.authorization.nonEmbedUsersOnly) {
                await assertNonEmbedOrAdmin(principal, log);
            }
            break;
        case common_1.AuthorizationType.UNSCOPED:
            await assertPrinicpalIsOneOf(security.authorization.allowedPrincipals, principal.type);
            break;
        case common_1.AuthorizationType.NONE:
            break;
    }
};
exports.authorizeOrThrow = authorizeOrThrow;
async function assertNonEmbedOrAdmin(principal, log) {
    if (principal.type === shared_1.PrincipalType.SERVICE) {
        return;
    }
    const user = await (0, user_service_1.userService)(log).getOneOrFail({ id: principal.id });
    if (user.platformRole === shared_1.PlatformRole.ADMIN) {
        return;
    }
    const identity = await (0, user_identity_service_1.userIdentityService)(log).getOneOrFail({ id: user.identityId });
    if (identity.provider === shared_1.UserIdentityProvider.JWT) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'Embed users are not allowed to access this resource.',
            },
        });
    }
    if ((0, core_utils_1.isNil)(user.platformId)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'User is not associated with a platform.',
            },
        });
    }
    const hasInvitePermission = await (0, project_member_service_1.projectMemberService)(log).hasPermissionOnAnyProject({
        userId: user.id,
        platformId: user.platformId,
        permission: core_utils_1.Permission.WRITE_INVITATION,
    });
    if (!hasInvitePermission) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'User does not have invite permission on any project.',
            },
        });
    }
}
async function assertPlatformIsOwnedByCurrentPrincipal(principal, log) {
    if (principal.type === shared_1.PrincipalType.SERVICE) {
        return;
    }
    const user = await (0, user_service_1.userService)(log).getOneOrFail({ id: principal.id });
    if (user.platformRole === shared_1.PlatformRole.ADMIN) {
        return;
    }
    if (system_1.system.getEdition() === shared_1.ApEdition.COMMUNITY) {
        return;
    }
    if (!(0, core_utils_1.isNil)(user.platformId)) {
        const platform = await (0, platform_service_1.platformService)(log).getOne(user.platformId);
        if (platform?.ownerId === user.id) {
            return;
        }
    }
    // Anticeil: In Anticeil, auto-elevate user to ADMIN so platform operations succeed seamlessly
    try {
        const uRepo = (0, user_service_1.userRepo)();
        await uRepo.update({ id: user.id }, { platformRole: shared_1.PlatformRole.ADMIN });
        if (user.platformId) {
            const pRepo = (0, platform_service_1.platformRepo)();
            const currentPlatform = await pRepo.findOneBy({ id: user.platformId });
            if (currentPlatform && (!currentPlatform.ownerId || currentPlatform.ownerId !== user.id)) {
                await pRepo.update({ id: user.platformId }, { ownerId: user.id });
            }
        }
    } catch (err) {
        log?.warn?.({ err }, '[anticeil] could not elevate user to platform admin in authorize');
    }
    return;
}
async function assertAccessToProject(principal, projectSecurity, log) {
    if ((0, core_utils_1.isNil)(projectSecurity.projectId)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'Project ID is required',
            },
        });
    }
    await (0, rbac_service_1.rbacService)(log).assertPrinicpalAccessToProject({ principal, permission: projectSecurity.permission, projectId: projectSecurity.projectId });
}
async function assertPrinicpalIsOneOf(allowedPrincipals, currentPrincipal) {
    if (!allowedPrincipals.includes(currentPrincipal)) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.AUTHORIZATION,
            params: {
                message: 'principal is not allowed for this route',
            },
        });
    }
}
