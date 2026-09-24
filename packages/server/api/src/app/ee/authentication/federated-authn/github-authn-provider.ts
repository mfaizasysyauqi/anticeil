import { ActivepiecesError, ErrorCode, isNil } from '@activepieces/core-utils'
import { FastifyBaseLogger } from 'fastify'
import { federatedAuthnService } from './federated-authn-service'

export const githubAuthnProvider = (log: FastifyBaseLogger) => ({
    async getLoginUrl(params: GetLoginUrlParams): Promise<string> {
        const { clientId } = params
        const loginUrl = new URL('https://github.com/login/oauth/authorize')
        loginUrl.searchParams.set('client_id', clientId)
        loginUrl.searchParams.set(
            'redirect_uri',
            await federatedAuthnService(log).getThirdPartyRedirectUrl(),
        )
        loginUrl.searchParams.set('scope', 'read:user user:email')
        return loginUrl.href
    },

    async authenticate(
        params: AuthenticateParams,
    ): Promise<FederatedAuthnUserProfile> {
        const { clientId, clientSecret, authorizationCode } = params
        const redirectUri = await federatedAuthnService(log).getThirdPartyRedirectUrl()

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
        })

        const tokenData = (await tokenResponse.json()) as {
            access_token?: string
            error?: string
            error_description?: string
        }

        if (isNil(tokenData.access_token)) {
            log.error({ tokenData }, '[GitHubOAuth] Token exchange failed')
            throw new ActivepiecesError(
                {
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                },
                `GitHub OAuth token exchange failed: ${tokenData.error_description || tokenData.error || 'no access_token returned'}`,
            )
        }

        // 2. Fetch user profile from GitHub API
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                'User-Agent': 'Anticeil-OAuth',
                Accept: 'application/json',
            },
        })

        if (!userResponse.ok) {
            throw new ActivepiecesError(
                {
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                },
                'Failed to fetch user profile from GitHub',
            )
        }

        const userData = (await userResponse.json()) as {
            name?: string | null
            login: string
            email?: string | null
            avatar_url?: string
        }

        let userEmail = userData.email

        // 3. If primary email is not public, fetch user emails list
        if (!userEmail) {
            const emailsResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                    'User-Agent': 'Anticeil-OAuth',
                    Accept: 'application/json',
                },
            })

            if (emailsResponse.ok) {
                const emails = (await emailsResponse.json()) as Array<{
                    email: string
                    primary: boolean
                    verified: boolean
                }>
                const primaryVerified = emails.find((e) => e.primary && e.verified)
                const anyVerified = emails.find((e) => e.verified)
                const fallback = emails[0]
                userEmail = (primaryVerified || anyVerified || fallback)?.email
            }
        }

        if (!userEmail) {
            throw new ActivepiecesError(
                {
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                },
                'GitHub account has no verified email address associated',
            )
        }

        const displayName = (userData.name || userData.login || 'GitHub User').trim()
        const nameParts = displayName.split(/\s+/)
        const firstName = nameParts[0] || userData.login || 'GitHub'
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ''

        return {
            email: userEmail,
            firstName,
            lastName,
            imageUrl: userData.avatar_url,
        }
    },
})

type GetLoginUrlParams = {
    clientId: string
    platformId: string | undefined
}

type AuthenticateParams = {
    clientId: string
    clientSecret: string
    authorizationCode: string
    platformId: string | undefined
}

export type FederatedAuthnUserProfile = {
    email: string
    firstName: string
    lastName?: string
    imageUrl?: string
}
