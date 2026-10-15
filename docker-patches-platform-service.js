"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformService = exports.platformRepo = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const shared_1 = require("@activepieces/shared");
const nanoid_1 = require("nanoid");
const authentication_utils_1 = require("../authentication/authentication-utils");
const user_identity_service_1 = require("../authentication/user-identity/user-identity-service");
const repo_factory_1 = require("../core/db/repo-factory");
const redis_connections_1 = require("../database/redis-connections");
const saml_client_1 = require("../authentication/saml-authn/saml-client");
const platform_plan_service_1 = require("../billing/platform-plan.service");
const theme_1 = require("../flags/theme");
const promise_handler_1 = require("../helper/promise-handler");
const system_1 = require("../helper/system/system");
const project_service_1 = require("../project/project-service");
const user_service_1 = require("../user/user-service");
const billing_provider_1 = require("./billing-provider");
const platform_entity_1 = require("./platform.entity");
exports.platformRepo = (0, repo_factory_1.repoFactory)(platform_entity_1.PlatformEntity);
const platformService = (log) => ({
    async listPlatformsForIdentityWithAtleastProject(params) {
        const users = await (0, user_service_1.userService)(log).getByIdentityId({ identityId: params.identityId });
        const platformsWithProjects = await Promise.all(users.map(async (user) => {
            if ((0, core_utils_1.isNil)(user.platformId) || user.status === shared_1.UserStatus.INACTIVE) {
                return null;
            }
            const hasProjects = await (0, project_service_1.projectService)(log).userHasProjects({
                platformId: user.platformId,
                userId: user.id,
                isPrivileged: (0, user_service_1.userService)(log).isUserPrivileged(user),
            });
            return hasProjects ? user.platformId : null;
        }));
        const platforms = await Promise.all(platformsWithProjects.filter((platformId) => !(0, core_utils_1.isNil)(platformId)).map((platformId) => this.getOneWithPlanOrThrow(platformId)));
        return platforms;
    },
    async create(params) {
        const { ownerId, name, primaryColor, logoIconUrl, fullLogoUrl, favIconUrl, } = params;
        const newPlatform = {
            id: (0, core_utils_1.apId)(),
            ownerId,
            name,
            primaryColor: primaryColor ?? theme_1.defaultTheme.colors.primary.default,
            logoIconUrl: logoIconUrl ?? theme_1.defaultTheme.logos.logoIconUrl,
            fullLogoUrl: fullLogoUrl ?? theme_1.defaultTheme.logos.fullLogoUrl,
            favIconUrl: favIconUrl ?? theme_1.defaultTheme.logos.favIconUrl,
            emailAuthEnabled: true,
            autoCreatePersonalProjects: true,
            enforceAllowedAuthDomains: false,
            allowedAuthDomains: [],
            federatedAuthProviders: { saml: null },
            cloudAuthEnabled: true,
            pinnedPieces: [],
            pieceSelectorConfig: null,
            allowedEmbedOrigins: [],
            googleAuthEnabled: true,
        };
        const savedPlatform = await (0, exports.platformRepo)().save(newPlatform);
        await (0, user_service_1.userService)(log).addOwnerToPlatform({
            id: ownerId,
            platformId: savedPlatform.id,
        });
        await (0, platform_plan_service_1.platformPlanService)(log).onPlatformCreated(savedPlatform.id);
        log.info({ platform: { id: savedPlatform.id }, ownerId }, 'Platform created');
        return stripFederatedAuth(savedPlatform);
    },
    async createPlatformWithProject({ identityId, name, invalidatePreviousTokens, isFirstPlatform, callerTokenVersion, beforeProvision }) {
        return (0, redis_connections_1.distributedLock)(log).runExclusive({
            key: `create-platform-${identityId}`,
            timeoutInSeconds: 30,
            fn: async () => {
                const existingUsers = isFirstPlatform ? await (0, user_service_1.userService)(log).getByIdentityId({ identityId }) : [];
                const provisionedOwner = findProvisionedOwner(existingUsers);
                const platformAlreadyProvisioned = !(0, core_utils_1.isNil)(provisionedOwner);
                if (platformAlreadyProvisioned) {
                    return resumeProvisionedPlatform({ owner: provisionedOwner, identityId, name, invalidatePreviousTokens, callerTokenVersion, log });
                }
                const ownerWithoutPlatform = existingUsers.find((user) => (0, core_utils_1.isNil)(user.platformId));
                const unlinkedPlatform = (0, core_utils_1.isNil)(ownerWithoutPlatform) ? null : await (0, exports.platformRepo)().findOneBy({ ownerId: ownerWithoutPlatform.id });
                const provisioningStoppedBeforeLinkingTheOwner = !(0, core_utils_1.isNil)(ownerWithoutPlatform) && !(0, core_utils_1.isNil)(unlinkedPlatform);
                if (provisioningStoppedBeforeLinkingTheOwner) {
                    await beforeProvision?.();
                    return linkOwnerToPlatform({ ownerId: ownerWithoutPlatform.id, platformId: unlinkedPlatform.id, identityId, name, invalidatePreviousTokens, log });
                }
                await beforeProvision?.();
                const owner = ownerWithoutPlatform
                    ?? await (0, user_service_1.userService)(log).create({
                        identityId,
                        platformRole: shared_1.PlatformRole.ADMIN,
                        platformId: null,
                    });
                const platform = await this.create({ ownerId: owner.id, name });
                const personalProject = await (0, project_service_1.projectService)(log).create({
                    displayName: personalProjectName(name),
                    ownerId: owner.id,
                    platformId: platform.id,
                    type: shared_1.ProjectType.PERSONAL,
                });
                if (invalidatePreviousTokens) {
                    await rotateTokenVersion(identityId);
                }
                await reportSignup({ identityId, user: owner, projectId: personalProject.id, log });
                const response = await (0, authentication_utils_1.authenticationUtils)(log).getProjectAndToken({
                    userId: owner.id,
                    platformId: platform.id,
                    projectId: personalProject.id,
                });
                return { response, provisioned: true };
            },
        });
    },
    async getAll() {
        return (0, exports.platformRepo)().find();
    },
    async getOldestPlatform() {
        return (0, exports.platformRepo)().findOne({
            where: {},
            order: {
                created: 'ASC',
            },
        });
    },
    async update(params) {
        if (params.federatedAuthProviders?.saml !== undefined) {
            const plan = await (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(params.id);
            if (!plan.ssoEnabled) {
                throw new core_utils_1.ActivepiecesError({
                    code: core_utils_1.ErrorCode.FEATURE_DISABLED,
                    params: {
                        message: 'SSO is not enabled for this platform',
                    },
                });
            }
            if (!(0, core_utils_1.isNil)(params.federatedAuthProviders.saml)) {
                const platform = await this.getOneOrThrow(params.id);
                if (platform.ssoDomainVerification?.status !== shared_1.SsoDomainVerificationStatus.VERIFIED) {
                    throw new core_utils_1.ActivepiecesError({
                        code: core_utils_1.ErrorCode.VALIDATION,
                        params: {
                            message: 'SSO domain must be verified before configuring SAML',
                        },
                    });
                }
            }
        }
        const platform = params.federatedAuthProviders !== undefined
            ? await this.getOneWithFederatedAuthOrThrow(params.id)
            : await this.getOneOrThrow(params.id);
        const federatedAuthProviders = hasFederatedAuth(platform)
            ? {
                ...platform.federatedAuthProviders,
                ...(params.federatedAuthProviders ?? {}),
            }
            : undefined;
        const updatedPlatform = {
            ...platform,
            ...(0, core_utils_1.spreadIfDefined)('federatedAuthProviders', federatedAuthProviders),
            ...(0, core_utils_1.spreadIfDefined)('name', params.name),
            ...(0, core_utils_1.spreadIfDefined)('primaryColor', params.primaryColor),
            ...(0, core_utils_1.spreadIfNotUndefined)('themeColors', params.themeColors),
            ...(0, core_utils_1.spreadIfDefined)('logoIconUrl', params.logoIconUrl),
            ...(0, core_utils_1.spreadIfDefined)('fullLogoUrl', params.fullLogoUrl),
            ...(0, core_utils_1.spreadIfDefined)('favIconUrl', params.favIconUrl),
            ...(0, core_utils_1.spreadIfDefined)('cloudAuthEnabled', params.cloudAuthEnabled),
            ...(0, core_utils_1.spreadIfDefined)('googleAuthEnabled', params.googleAuthEnabled),
            ...(0, core_utils_1.spreadIfDefined)('emailAuthEnabled', params.emailAuthEnabled),
            ...(0, core_utils_1.spreadIfDefined)('autoCreatePersonalProjects', params.autoCreatePersonalProjects),
            ...(0, core_utils_1.spreadIfDefined)('enforceAllowedAuthDomains', params.enforceAllowedAuthDomains),
            ...(0, core_utils_1.spreadIfDefined)('allowedAuthDomains', params.allowedAuthDomains),
            ...(0, core_utils_1.spreadIfDefined)('allowedEmbedOrigins', params.allowedEmbedOrigins),
            ...(0, core_utils_1.spreadIfDefined)('ssoDomain', params.ssoDomain),
            ...(0, core_utils_1.spreadIfDefined)('ssoDomainVerification', params.ssoDomainVerification),
            ...(0, core_utils_1.spreadIfDefined)('pinnedPieces', params.pinnedPieces),
            ...(0, core_utils_1.spreadIfNotUndefined)('pieceSelectorConfig', params.pieceSelectorConfig),
        };
        if (!(0, core_utils_1.isNil)(params.plan)) {
            await (0, platform_plan_service_1.platformPlanService)(log).update({
                platformId: params.id,
                ...params.plan,
            });
        }
        if (!(0, core_utils_1.isNil)(params.federatedAuthProviders?.saml)) {
            (0, saml_client_1.invalidateSamlClientCache)(params.id);
        }
        log.info({ platform: { id: params.id } }, 'Platform updated');
        const saved = await (0, exports.platformRepo)().save(updatedPlatform);
        return stripFederatedAuth(saved);
    },
    async getOneOrThrow(id) {
        return (0, exports.platformRepo)().findOneByOrFail({ id });
    },
    async getOne(id) {
        return (0, exports.platformRepo)().findOneBy({ id });
    },
    async getOneWithFederatedAuthOrThrow(id) {
        return (0, exports.platformRepo)()
            .createQueryBuilder('platform')
            .addSelect('platform.federatedAuthProviders')
            .where({ id })
            .getOneOrFail();
    },
    async hasSamlConfigured(id) {
        const result = await (0, exports.platformRepo)()
            .createQueryBuilder('platform')
            .select('platform."federatedAuthProviders"', 'federatedAuthProviders')
            .where({ id })
            .getRawOne();
        return !(0, core_utils_1.isNil)(result?.federatedAuthProviders?.saml);
    },
    async getOneWithPlan(id) {
        const platform = await this.getOne(id);
        if ((0, core_utils_1.isNil)(platform)) {
            return null;
        }
        const [samlConfigured, plan, usage] = await Promise.all([
            this.hasSamlConfigured(id),
            getPlan(log, platform),
            getUsage(log, platform),
        ]);
        return {
            ...platform,
            federatedAuthProviders: { saml: samlConfigured ? {} : null },
            usage,
            plan,
        };
    },
    async getOneWithPlanOrThrow(id) {
        const platform = await this.getOneOrThrow(id);
        const [samlConfigured, plan] = await Promise.all([
            this.hasSamlConfigured(id),
            getPlan(log, platform),
        ]);
        return {
            ...platform,
            federatedAuthProviders: { saml: samlConfigured ? {} : null },
            plan,
        };
    },
    async getOneWithPlanAndUsageOrThrow(id) {
        const platform = await this.getOneOrThrow(id);
        const [samlConfigured, usage, plan, billingEnforced] = await Promise.all([
            this.hasSamlConfigured(id),
            getUsage(log, platform),
            getPlan(log, platform),
            getBillingEnforced(log, id),
        ]);
        return {
            ...platform,
            federatedAuthProviders: { saml: samlConfigured ? {} : null },
            usage,
            billingEnforced,
            plan,
        };
    },
});
exports.platformService = platformService;
function findProvisionedOwner(users) {
    return users.find((user) => !(0, core_utils_1.isNil)(user.platformId));
}
async function resumeProvisionedPlatform({ owner, identityId, name, invalidatePreviousTokens, callerTokenVersion, log }) {
    const identity = await (0, user_identity_service_1.userIdentityService)(log).getOneOrFail({ id: identityId });
    const earlierAttemptNeverRotated = isSameTokenVersion(identity.tokenVersion, callerTokenVersion);
    const response = await finishExistingPlatform({
        user: owner,
        platformId: owner.platformId,
        name,
        invalidatePreviousTokens: invalidatePreviousTokens && earlierAttemptNeverRotated,
        identityId,
        log,
    });
    return { response, provisioned: false };
}
async function linkOwnerToPlatform({ ownerId, platformId, identityId, name, invalidatePreviousTokens, log }) {
    await (0, user_service_1.userService)(log).addOwnerToPlatform({ id: ownerId, platformId });
    const owner = await (0, user_service_1.userService)(log).getOneOrFail({ id: ownerId });
    const response = await finishExistingPlatform({
        user: owner,
        platformId,
        name,
        invalidatePreviousTokens,
        identityId,
        log,
    });
    if (!(0, core_utils_1.isNil)(response.projectId)) {
        (0, promise_handler_1.rejectedPromiseHandler)(reportSignup({ identityId, user: owner, projectId: response.projectId, log }), log);
    }
    return { response, provisioned: true };
}
async function reportSignup({ identityId, user, projectId, log }) {
    await (0, authentication_utils_1.authenticationUtils)(log).sendTelemetry({
        identity: await (0, user_identity_service_1.userIdentityService)(log).getOneOrFail({ id: identityId }),
        user,
        projectId,
    });
}
function isSameTokenVersion(current, caller) {
    const neitherHasBeenRotated = (0, core_utils_1.isNil)(current) && (0, core_utils_1.isNil)(caller);
    return neitherHasBeenRotated || current === caller;
}
async function rotateTokenVersion(identityId) {
    await (0, user_identity_service_1.userIdentityRepository)().update(identityId, {
        tokenVersion: (0, nanoid_1.nanoid)(),
    });
}
function personalProjectName(platformName) {
    const noun = ' Platform';
    if (platformName.endsWith(noun)) {
        return `${platformName.slice(0, -noun.length)} Project`;
    }
    return /['’]s$/.test(platformName) ? `${platformName} Project` : `${platformName}'s Project`;
}
async function finishExistingPlatform({ user, platformId, name, invalidatePreviousTokens, identityId, log }) {
    const hasProjects = await (0, project_service_1.projectService)(log).userHasProjects({
        platformId,
        userId: user.id,
        isPrivileged: (0, user_service_1.userService)(log).isUserPrivileged(user),
    });
    const project = hasProjects
        ? null
        : await (0, project_service_1.projectService)(log).create({
            displayName: personalProjectName(name),
            ownerId: user.id,
            platformId,
            type: shared_1.ProjectType.PERSONAL,
        });
    if (invalidatePreviousTokens) {
        await rotateTokenVersion(identityId);
    }
    return (0, authentication_utils_1.authenticationUtils)(log).getProjectAndToken({
        userId: user.id,
        platformId,
        projectId: project?.id ?? null,
    });
}
async function getUsage(log, platform) {
    const edition = system_1.system.getEdition();
    if (edition === shared_1.ApEdition.COMMUNITY) {
        return undefined;
    }
    return (0, platform_plan_service_1.platformPlanService)(log).getUsage(platform.id);
}
async function getBillingEnforced(log, platformId) {
    if (system_1.system.getEdition() === shared_1.ApEdition.COMMUNITY) {
        return undefined;
    }
    const { data, error } = await (0, core_utils_1.tryCatch)(() => billing_provider_1.billingProvider.get(log).isBillingEnforced(platformId));
    if (!(0, core_utils_1.isNil)(error)) {
        log.warn({ error, platform: { id: platformId } }, 'Failed to resolve billing enforcement for the platform payload');
        return undefined;
    }
    return data ?? undefined;
}
async function getPlan(log, platform) {
    let resolvedPlan;
    try {
        resolvedPlan = await (0, platform_plan_service_1.platformPlanService)(log).getOrCreateForPlatform(platform.id);
    }
    catch (e) {
        log.warn({ error: e, platformId: platform.id }, 'Fallback to default plan');
        resolvedPlan = {
            ...shared_1.OPEN_SOURCE_PLAN,
        };
    }
    return {
        ...resolvedPlan,
        agentsEnabled: true,
        aiProvidersEnabled: true,
        analyticsEnabled: true,
        chatEnabled: true,
        tablesEnabled: true,
    };
}
function stripFederatedAuth(platform) {
    const { federatedAuthProviders: _omitted, ...rest } = platform;
    return rest;
}
function hasFederatedAuth(platform) {
    return 'federatedAuthProviders' in platform;
}
//# sourceMappingURL=platform.service.js.map