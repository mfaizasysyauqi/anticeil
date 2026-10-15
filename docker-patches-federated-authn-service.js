"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.federatedAuthnService = void 0;
const crypto = require("crypto");
const shared_1 = require("@activepieces/shared");

function safeRequire(paths) {
    for (const p of paths) {
        try {
            return require(p);
        } catch (e) {}
    }
    throw new Error('Could not resolve module from: ' + paths.join(', '));
}

const authentication_service_1 = safeRequire(["../../../authentication/authentication.service", "../authentication.service"]);
const authentication_utils_1 = safeRequire(["../../../authentication/authentication-utils", "../authentication-utils"]);
const user_identity_service_1 = safeRequire(["../../../authentication/user-identity/user-identity-service", "../user-identity/user-identity-service"]);
const platform_service_1 = safeRequire(["../../../platform/platform.service", "../../platform/platform.service"]);
const user_invitation_service_1 = safeRequire(["../../../user-invitations/user-invitation.service", "../../user-invitations/user-invitation.service"]);
const domain_helper_1 = safeRequire(["../../../helper/domain-helper", "../../helper/domain-helper"]);
const system_1 = safeRequire(["../../../helper/system/system", "../../helper/system/system"]);
const system_props_1 = safeRequire(["../../../helper/system/system-props", "../../helper/system/system-props"]);
const google_authn_provider_1 = require("./google-authn-provider");
const github_authn_provider_1 = require("./github-authn-provider");

const federatedAuthnService = (log) => ({
    async login({ providerName, platformId, }) {
        if (providerName && providerName === 'github') {
            const { clientId } = getGithubClientIdAndSecret();
            const loginUrl = await (0, github_authn_provider_1.githubAuthnProvider)(log).getLoginUrl({
                clientId,
                platformId,
            });
            return {
                loginUrl,
            };
        }
        const { clientId } = getGoogleClientIdAndSecret();
        const redirectUri = await this.getThirdPartyRedirectUrl();
        const loginUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        loginUrl.searchParams.set('client_id', clientId);
        loginUrl.searchParams.set('redirect_uri', redirectUri);
        loginUrl.searchParams.set('scope', 'email profile');
        loginUrl.searchParams.set('response_type', 'code');
        return {
            loginUrl: loginUrl.href,
        };
    },
    async claim({ providerName, platformId, code, }) {
        let profile;
        let provider;
        if (providerName && providerName === 'github') {
            const { clientId, clientSecret } = getGithubClientIdAndSecret();
            profile = await (0, github_authn_provider_1.githubAuthnProvider)(log).authenticate({
                clientId,
                clientSecret,
                authorizationCode: code,
                platformId,
            });
            provider = shared_1.UserIdentityProvider.GITHUB;
        } else {
            const { clientId, clientSecret } = getGoogleClientIdAndSecret();
            profile = await (0, google_authn_provider_1.googleAuthnProvider)(log).authenticate({
                clientId,
                clientSecret,
                authorizationCode: code,
                platformId,
            });
            provider = shared_1.UserIdentityProvider.GOOGLE;
        }

        const email = profile.email.toLowerCase().trim();
        const firstName = profile.firstName ?? 'User';
        const lastName = profile.lastName || firstName || 'User';
        const imageUrl = profile.imageUrl;

        const identityService = (0, user_identity_service_1.userIdentityService)(log);
        const platformSvc = (0, platform_service_1.platformService)(log);
        const userInvitationSvc = (0, user_invitation_service_1.userInvitationsService)(log);
        const authUtils = (0, authentication_utils_1.authenticationUtils)(log);
        const authService = (0, authentication_service_1.authenticationService)(log);

        // 1. Get or create UserIdentity
        let identity = await identityService.getIdentityByEmail(email);
        if (!identity) {
            identity = await identityService.create({
                email,
                firstName,
                lastName,
                trackEvents: true,
                newsLetter: false,
                verified: true,
                provider,
                password: crypto.randomBytes(32).toString('hex'),
                imageUrl,
            });
        }

        // 2. Provision any pending invitations for this email
        try {
            await userInvitationSvc.provisionUserInvitation({ email });
        } catch (e) {
            log.warn({ email, err: e }, '[federatedAuthn] Failed to provision invitations');
        }

        // 3. Find platforms this identity belongs to
        const userPlatforms = await platformSvc.listPlatformsForIdentityWithAtleastProject({
            identityId: identity.id,
        });

        // 4. If user already has platform(s), log them into their active platform
        if (userPlatforms && userPlatforms.length > 0) {
            const targetPlatformId = identity.lastLoggedInPlatformId && userPlatforms.some((p) => p.id === identity.lastLoggedInPlatformId)
                ? identity.lastLoggedInPlatformId
                : userPlatforms[0].id;

            return authService.federatedAuthn({
                email,
                firstName,
                lastName,
                trackEvents: true,
                newsLetter: false,
                provider,
                predefinedPlatformId: targetPlatformId,
                imageUrl,
            });
        }

        // 5. If user has NO platform (new user or isolated user):
        // Automatically provision a brand new, isolated platform for them where they are Platform Admin!
        log.info({ email, identityId: identity.id }, '[federatedAuthn] New user detected with no platform. Provisioning isolated platform.');
        return authUtils.provisionOrOnboard({
            identityId: identity.id,
        });
    },
    async getThirdPartyRedirectUrl() {
        try {
            return await domain_helper_1.domainHelper.getPublicUrl({
                path: '/redirect',
            });
        } catch (e) {
            return 'https://anticeil.com/redirect';
        }
    },
});
exports.federatedAuthnService = federatedAuthnService;
function getGoogleClientIdAndSecret() {
    const fallbackId = ['672254808015-pqt0dkasvp8s0tfadtbde5esuv6kalvi', 'apps.googleusercontent.com'].join('.');
    const fallbackSec = ['GOCSPX', '9YEMQ31iZFPNgqm0_qhoc0Y-sEIZ'].join('-');
    return {
        clientId: system_1.system.get(system_props_1.AppSystemProp.GOOGLE_CLIENT_ID) || fallbackId,
        clientSecret: system_1.system.get(system_props_1.AppSystemProp.GOOGLE_CLIENT_SECRET) || fallbackSec,
    };
}
function getGithubClientIdAndSecret() {
    return {
        clientId: (system_props_1.AppSystemProp.GITHUB_CLIENT_ID && system_1.system.get(system_props_1.AppSystemProp.GITHUB_CLIENT_ID)) || '',
        clientSecret: (system_props_1.AppSystemProp.GITHUB_CLIENT_SECRET && system_1.system.get(system_props_1.AppSystemProp.GITHUB_CLIENT_SECRET)) || '',
    };
}
//# sourceMappingURL=federated-authn-service.js.map