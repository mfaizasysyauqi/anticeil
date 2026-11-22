import { ActivepiecesError, ErrorCode, isNil } from '@activepieces/core-utils'
import { FastifyBaseLogger } from 'fastify'
import { federatedAuthnService } from './federated-authn-service'

export type OktaUserProfile = {
    email: string
    firstName?: string
    lastName?: string
    imageUrl?: string
}

export type GetOktaLoginUrlParams = {
    clientId: string
    domain: string
    platformId?: string
}

export type AuthenticateOktaParams = {
    clientId: string
    clientSecret: string
    domain: string
    authorizationCode: string
    platformId?: string
}

const normalizeDomain = (domain: string): string => {
    let clean = domain.trim()
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = `https://${clean}`
    }
    return clean.replace(/\/+$/, '')
}

export const oktaAuthnProvider = (log: FastifyBaseLogger) => ({
    async getLoginUrl(params: GetOktaLoginUrlParams): Promise<string> {
        const { clientId, domain } = params
        const baseUrl = normalizeDomain(domain)
        const loginUrl = new URL(`${baseUrl}/authorize`)
        loginUrl.searchParams.set('client_id', clientId)
        loginUrl.searchParams.set(
            'redirect_uri',
            await federatedAuthnService(log).getThirdPartyRedirectUrl(),
        )
        loginUrl.searchParams.set('response_type', 'code')
        loginUrl.searchParams.set('scope', 'openid email profile')
        loginUrl.searchParams.set('prompt', 'login')

        return loginUrl.href
    },

    async authenticate(
        params: AuthenticateOktaParams,
    ): Promise<OktaUserProfile> {
        const { clientId, clientSecret, domain, authorizationCode } = params
        const baseUrl = normalizeDomain(domain)
        const redirectUri = await federatedAuthnService(log).getThirdPartyRedirectUrl()

        // 1. Exchange authorization code for tokens
        const tokenResponse = await fetch(`${baseUrl}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code: authorizationCode,
                redirect_uri: redirectUri,
            }),
        })

        const tokenData = (await tokenResponse.json()) as {
            access_token?: string
            id_token?: string
            error?: string
            error_description?: string
        }

        if (isNil(tokenData.access_token)) {
            log.error({ tokenData }, '[OktaOAuth] Token exchange failed')
            throw new ActivepiecesError(
                {
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                },
                `Okta OAuth token exchange failed: ${tokenData.error_description || tokenData.error || 'no access_token returned'}`,
            )
        }

        // 2. Fetch user profile from /userinfo endpoint
        const userResponse = await fetch(`${baseUrl}/userinfo`, {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/json',
            },
        })

        if (!userResponse.ok) {
            log.error({ status: userResponse.status }, '[OktaOAuth] Failed to fetch user profile from userinfo')
            throw new ActivepiecesError(
                {
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                },
                'Failed to fetch user profile from Okta /userinfo',
            )
        }

        const userData = (await userResponse.json()) as {
            sub?: string
            name?: string | null
            given_name?: string | null
            family_name?: string | null
            email?: string | null
            picture?: string | null
        }

        const email = (userData.email || '').toLowerCase().trim()
        if (!email) {
            throw new ActivepiecesError(
                {
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                },
                'No email associated with Okta account',
            )
        }

        const firstName = userData.given_name || (userData.name ? userData.name.split(' ')[0] : 'User')
        const lastName = userData.family_name || (userData.name ? userData.name.split(' ').slice(1).join(' ') : 'User')

        return {
            email,
            firstName,
            lastName,
            imageUrl: userData.picture || undefined,
        }
    },
})
