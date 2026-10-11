"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubAuthnProvider = void 0;
const core_utils_1 = require("@activepieces/core-utils");
const federated_authn_service_1 = require("./federated-authn-service");
const githubAuthnProvider = (log) => ({
    async getLoginUrl(params) {
        const { clientId } = params;
        const loginUrl = new URL('https://github.com/login/oauth/authorize');
        loginUrl.searchParams.set('client_id', clientId);
        loginUrl.searchParams.set('redirect_uri', await (0, federated_authn_service_1.federatedAuthnService)(log).getThirdPartyRedirectUrl());
        loginUrl.searchParams.set('scope', 'read:user user:email');
        return loginUrl.href;
    },
    async authenticate(params) {
        const { clientId, clientSecret, authorizationCode } = params;
        const redirectUri = await (0, federated_authn_service_1.federatedAuthnService)(log).getThirdPartyRedirectUrl();
        // 1. Exchange authorization code for access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: authorizationCode,
                redirect_uri: redirectUri,
            }),
        });
        const tokenData = (await tokenResponse.json());
        if ((0, core_utils_1.isNil)(tokenData.access_token)) {
            log.error({ tokenData }, '[GitHubOAuth] Token exchange failed');
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.INVALID_CREDENTIALS,
                params: null,
            }, `GitHub OAuth token exchange failed: ${tokenData.error_description || tokenData.error || 'no access_token returned'}`);
        }
        // 2. Fetch user profile from GitHub API
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'User-Agent': 'Anticeil-OAuth',
                Accept: 'application/json',
            },
        });
        if (!userResponse.ok) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.INVALID_CREDENTIALS,
                params: null,
            }, 'Failed to fetch user profile from GitHub');
        }
        const userData = (await userResponse.json());
        let userEmail = userData.email;
        // 3. If primary email is not public, fetch user emails list
        if (!userEmail) {
            const emailsResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                    'User-Agent': 'Anticeil-OAuth',
                    Accept: 'application/json',
                },
            });
            if (emailsResponse.ok) {
                const emails = (await emailsResponse.json());
                const primaryVerified = emails.find((e) => e.primary && e.verified);
                const anyVerified = emails.find((e) => e.verified);
                const fallback = emails[0];
                userEmail = (primaryVerified || anyVerified || fallback)?.email;
            }
        }
        if (!userEmail) {
            throw new core_utils_1.ActivepiecesError({
                code: core_utils_1.ErrorCode.INVALID_CREDENTIALS,
                params: null,
            }, 'GitHub account has no verified email address associated');
        }
        const displayName = (userData.name || userData.login || 'GitHub User').trim();
        const nameParts = displayName.split(/\s+/);
        const firstName = nameParts[0] || userData.login || 'GitHub';
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        return {
            email: userEmail,
            firstName,
            lastName,
            imageUrl: userData.avatar_url,
        };
    },
});
exports.githubAuthnProvider = githubAuthnProvider;
//# sourceMappingURL=github-authn-provider.js.map
