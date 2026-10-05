"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.federatedAuthnService = void 0;
const shared_1 = require("@activepieces/shared");
const authentication_service_1 = require("../../../authentication/authentication.service");
const domain_helper_1 = require("../../../helper/domain-helper");
const system_1 = require("../../../helper/system/system");
const system_props_1 = require("../../../helper/system/system-props");
const google_authn_provider_1 = require("./google-authn-provider");
const federatedAuthnService = (log) => ({
    async login({ platformId, }) {
        const { clientId } = getClientIdAndSecret();
        const loginUrl = await (0, google_authn_provider_1.googleAuthnProvider)(log).getLoginUrl({
            clientId,
            platformId,
        });
        return {
            loginUrl,
        };
    },
    async claim({ platformId, code, }) {
        const { clientId, clientSecret } = getClientIdAndSecret();
        const idToken = await (0, google_authn_provider_1.googleAuthnProvider)(log).authenticate({
            clientId,
            clientSecret,
            authorizationCode: code,
            platformId,
        });
        return (0, authentication_service_1.authenticationService)(log).federatedAuthn({
            email: idToken.email,
            firstName: idToken.firstName ?? 'john',
            lastName: idToken.lastName ?? 'doe',
            trackEvents: true,
            newsLetter: true,
            provider: shared_1.UserIdentityProvider.GOOGLE,
            predefinedPlatformId: platformId ?? null,
            imageUrl: idToken.imageUrl,
        });
    },
    async getThirdPartyRedirectUrl() {
        return domain_helper_1.domainHelper.getPublicUrl({
            path: '/redirect',
        });
    },
});
exports.federatedAuthnService = federatedAuthnService;
function getClientIdAndSecret() {
    return {
        clientId: system_1.system.getOrThrow(system_props_1.AppSystemProp.GOOGLE_CLIENT_ID),
        clientSecret: system_1.system.getOrThrow(system_props_1.AppSystemProp.GOOGLE_CLIENT_SECRET),
    };
}
//# sourceMappingURL=federated-authn-service.js.map