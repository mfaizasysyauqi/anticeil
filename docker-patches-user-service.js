"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.userRepo = void 0;
exports.mapToUserWithMetaInformation = mapToUserWithMetaInformation;
const tslib_1 = require("tslib");
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const dayjs_1 = tslib_1.__importDefault(require("dayjs"));
const nanoid_1 = require("nanoid");
const typeorm_1 = require("typeorm");
const user_identity_service_1 = require("../authentication/user-identity/user-identity-service");
const repo_factory_1 = require("../core/db/repo-factory");
const transaction_1 = require("../core/db/transaction");
const platform_plan_service_1 = require("../billing/platform-plan.service");
const platform_project_service_1 = require("../project/platform-project-service");
const project_role_service_1 = require("../project/project-role/project-role.service");
const build_paginator_1 = require("../helper/pagination/build-paginator");
const pagination_utils_1 = require("../helper/pagination/pagination-utils");
const system_1 = require("../helper/system/system");
const platform_service_1 = require("../platform/platform.service");
const project_service_1 = require("../project/project-service");
const user_entity_1 = require("./user-entity");
exports.userRepo = (0, repo_factory_1.repoFactory)(user_entity_1.UserEntity);
const userService = (log) => ({
    async create(params) {
        const isActive = params.isActive ?? true;
        const user = {
            id: (0, core_utils_1.apId)(),
            identityId: params.identityId,
            platformRole: params.platformRole,
            status: isActive ? shared_1.UserStatus.ACTIVE : shared_1.UserStatus.INACTIVE,
            externalId: params.externalId,
            platformId: params.platformId,
        };
        return (0, exports.userRepo)().save(user);
    },
    async getOrCreateWithProject({ identity, platformId }) {
        const user = await this.getOneByIdentityAndPlatform({
            identityId: identity.id,
            platformId,
        });
        if ((0, core_utils_1.isNil)(user)) {
            const newUser = await this.create({
                identityId: identity.id,
                platformId,
                platformRole: system_1.system.getEdition() === shared_1.ApEdition.COMMUNITY ? shared_1.PlatformRole.ADMIN : shared_1.PlatformRole.MEMBER,
            });
            const platform = await (0, platform_service_1.platformService)(log).getOneOrThrow(platformId);
            if (platform.autoCreatePersonalProjects) {
                await (0, project_service_1.projectService)(log).create({
                    displayName: identity.firstName + '\'s Project',
                    ownerId: newUser.id,
                    platformId,
                    type: shared_1.ProjectType.PERSONAL,
                });
            }
            return { user: newUser, created: true };
        }
        return { user, created: false };
    },
    async updateLastActiveDate({ id }) {
        await (0, exports.userRepo)().update({ id }, { lastActiveDate: (0, dayjs_1.default)().toISOString() });
    },
    async update({ id, status, platformId, platformRole, externalId }) {
        const user = await this.getOrThrow({ id });
        (0, core_utils_1.assertNotNullOrUndefined)(user.platformId, 'platformId');
        if (user.platformId !== platformId) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
                params: {
                    entityType: 'user',
                    entityId: id,
                },
            });
        }
        const platform = await (0, platform_service_1.platformService)(log).getOneOrThrow(user.platformId);
        if (platform.ownerId === user.id) {
            if (status === shared_1.UserStatus.INACTIVE) {
                throw new core_utils_1.ActivepiecesError({
                    code: core_utils_1.ErrorCode.VALIDATION,
                    params: {
                        message: 'Admin cannot be deactivated',
                    },
                });
            }
            if (platformRole && platformRole !== shared_1.PlatformRole.ADMIN) {
                throw new core_utils_1.ActivepiecesError({
                    code: core_utils_1.ErrorCode.VALIDATION,
                    params: {
                        message: 'Platform owner role cannot be changed from Admin',
                    },
                });
            }
        }
        const applyUpdate = (entityManager) => (0, exports.userRepo)(entityManager).update({
            id,
            platformId,
        }, {
            ...(0, core_utils_1.spreadIfDefined)('status', status),
            ...(0, core_utils_1.spreadIfDefined)('platformRole', platformRole),
            ...(0, core_utils_1.spreadIfDefined)('externalId', externalId),
        });
        const isReactivation = user.status === shared_1.UserStatus.INACTIVE && status === shared_1.UserStatus.ACTIVE;
        if (isReactivation) {
            const reactivatingPlatformId = user.platformId;
            await (0, transaction_1.transaction)(async (entityManager) => {
                await (0, platform_plan_service_1.platformPlanService)(log).checkUsersExceededLimit({ platformId: reactivatingPlatformId, entityManager });
                await applyUpdate(entityManager);
            });
        }
        else {
            await applyUpdate();
        }
        return this.getMetaInformation({ id });
    },
    async getUsersByIdentityId({ identityId }) {
        return (0, exports.userRepo)().find({ where: { identityId } }).then((users) => users.map((user) => ({ id: user.id, platformId: user.platformId })));
    },
    async countByPlatformId(platformId) {
        return (0, exports.userRepo)().countBy({ platformId });
    },
    async countActiveByPlatformId({ platformId, entityManager }) {
        return (0, exports.userRepo)(entityManager).countBy({ platformId, status: shared_1.UserStatus.ACTIVE });
    },
    async list({ platformId, externalId, cursorRequest, limit }) {
        const decodedCursor = pagination_utils_1.paginationHelper.decodeCursor(cursorRequest);
        const paginator = (0, build_paginator_1.buildPaginator)({
            entity: user_entity_1.UserEntity,
            query: {
                limit,
                afterCursor: decodedCursor.nextCursor,
                beforeCursor: decodedCursor.previousCursor,
            },
        });
        const { data, cursor } = await paginator.paginate((0, exports.userRepo)().createQueryBuilder('user').where({
            platformId,
            ...(0, core_utils_1.spreadIfDefined)('externalId', externalId),
        }));
        const usersWithMetaInformation = await Promise.all(data.map(this.getMetaInformation));
        return pagination_utils_1.paginationHelper.createPage(usersWithMetaInformation, cursor);
    },
    async getByIdentityId({ identityId }) {
        return (0, exports.userRepo)().find({ where: { identityId } });
    },
    async getOneByIdentityAndPlatform({ identityId, platformId }) {
        return (0, exports.userRepo)().findOneBy({ identityId, platformId: (0, core_utils_1.isNil)(platformId) ? (0, typeorm_1.IsNull)() : platformId });
    },
    async get({ id }) {
        return (0, exports.userRepo)().findOneBy({ id });
    },
    async getOrThrow({ id }) {
        const user = await (0, exports.userRepo)().findOneBy({ id });
        if ((0, core_utils_1.isNil)(user)) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
                params: { entityType: 'user', entityId: id },
            });
        }
        return user;
    },
    async getOneOrFail({ id }) {
        return (0, exports.userRepo)().findOneOrFail({ where: { id } });
    },
    async getOneByIdAndPlatformIdOrThrow({ id, platformId }) {
        const user = await (0, exports.userRepo)().findOne({ where: { id, platformId } });
        if ((0, core_utils_1.isNil)(user)) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.ENTITY_NOT_FOUND,
                params: { entityType: 'user', entityId: id },
            });
        }
        return this.getMetaInformation({ id });
    },
    async delete({ id, platformId }) {
        await assertNotPlatformOwner({ id, platformId, log });
        const user = await (0, exports.userRepo)().findOneBy({ id, platformId });
        if ((0, core_utils_1.isNil)(user)) {
            return;
        }
        await (0, platform_project_service_1.platformProjectService)(log).deletePersonalProjectForUser({
            userId: id,
            platformId,
        });
        await (0, transaction_1.transaction)(async (entityManager) => {
            await (0, exports.userRepo)(entityManager).delete({
                id,
                platformId,
            });
            await deleteIdentityIfOrphaned({ identityId: user.identityId, entityManager });
        });
    },
    async removeFromPlatform({ id, platformId }) {
        await assertNotPlatformOwner({ id, platformId, log });
        const user = await this.getOneOrFail({ id });
        await (0, platform_project_service_1.platformProjectService)(log).deletePersonalProjectForUser({
            userId: id,
            platformId,
        });
        await (0, exports.userRepo)().update({
            id,
            platformId,
        }, {
            platformId: null,
        });
        await (0, user_identity_service_1.userIdentityRepository)().update(user.identityId, {
            tokenVersion: (0, nanoid_1.nanoid)(),
        });
        await (0, user_identity_service_1.userIdentityRepository)().update({
            id: user.identityId,
            lastLoggedInPlatformId: platformId,
        }, {
            lastLoggedInPlatformId: null,
        });
    },
    async getByPlatformRole(id, role) {
        return (0, exports.userRepo)().find({ where: { platformId: id, platformRole: role }, relations: { identity: true } });
    },
    async listProjectUsers({ platformId, projectId }) {
        const users = await getUsersForProject(platformId, projectId);
        const usersWithMetaInformation = await (0, exports.userRepo)().find({ where: { platformId, id: (0, typeorm_1.In)(users) }, relations: { identity: true } }).then((users) => users.map(this.getMetaInformation));
        return Promise.all(usersWithMetaInformation);
    },
    async getByPlatformAndExternalId({ platformId, externalId, }) {
        return (0, exports.userRepo)().findOneBy({
            platformId,
            externalId,
        });
    },
    async getMetaInformation({ id }) {
        const user = await (0, exports.userRepo)().findOneByOrFail({ id });
        const identity = await (0, user_identity_service_1.userIdentityService)(log).getBasicInformation(user.identityId);
        return {
            id: user.id,
            email: identity.email,
            firstName: identity.firstName,
            lastName: identity.lastName,
            platformId: user.platformId,
            platformRole: user.platformRole,
            status: user.status,
            externalId: user.externalId,
            created: user.created,
            updated: user.updated,
            lastActiveDate: user.lastActiveDate,
            imageUrl: identity.imageUrl,
        };
    },
    async addOwnerToPlatform({ id, platformId, }) {
        await (0, exports.userRepo)().update(id, {
            updated: (0, dayjs_1.default)().toISOString(),
            platformRole: shared_1.PlatformRole.ADMIN,
            platformId,
        });
    },
    isUserPrivileged(user) {
        return user.platformRole === shared_1.PlatformRole.ADMIN || user.platformRole === shared_1.PlatformRole.OPERATOR;
    },
});
exports.userService = userService;
function mapToUserWithMetaInformation(user) {
    if ((0, core_utils_1.isNil)(user)) {
        return null;
    }
    const identity = user.identity;
    if ((0, core_utils_1.isNil)(identity)) {
        return null;
    }
    return {
        id: user.id,
        email: identity.email,
        firstName: identity.firstName,
        lastName: identity.lastName,
        platformId: user.platformId,
        platformRole: user.platformRole,
        status: user.status,
        externalId: user.externalId,
        created: user.created,
        updated: user.updated,
        lastActiveDate: user.lastActiveDate,
        imageUrl: identity.imageUrl,
    };
}
async function assertNotPlatformOwner({ id, platformId, log }) {
    const platform = await (0, platform_service_1.platformService)(log).getOneOrThrow(platformId);
    if (platform.ownerId === id) {
        throw new core_utils_1.ActivepiecesError({
            code: core_utils_1.ErrorCode.VALIDATION,
            params: {
                message: 'Platform owner cannot be deleted',
            },
        });
    }
}
async function deleteIdentityIfOrphaned({ identityId, entityManager }) {
    const identityStillReferenced = await (0, exports.userRepo)(entityManager).existsBy({ identityId });
    if (!identityStillReferenced) {
        await (0, user_identity_service_1.userIdentityRepository)(entityManager).delete({ id: identityId });
    }
}
async function getUsersForProject(platformId, projectId) {
    const platformAdmins = await (0, exports.userRepo)().find({ where: { platformId, platformRole: shared_1.PlatformRole.ADMIN } }).then((users) => users.map((user) => user.id));
    const edition = system_1.system.getEdition();
    if (edition === shared_1.ApEdition.COMMUNITY) {
        return platformAdmins;
    }
    const projectMembers = await (0, project_role_service_1.projectMemberRepo)().find({ where: { projectId, platformId } }).then((members) => members.map((member) => member.userId));
    return [...platformAdmins, ...projectMembers];
}
//# sourceMappingURL=user-service.js.map