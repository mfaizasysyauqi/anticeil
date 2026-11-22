import { ActivepiecesError, ErrorCode, isNil } from '@activepieces/core-utils'
import { FastifyBaseLogger } from 'fastify'
import { federatedAuthnService } from './federated-authn-service'

export type MicrosoftUserProfile = {
    email: string
    firstName?: string
    lastName?: string
    imageUrl?: string
}

export type GetMicrosoftLoginUrlParams = {
    clientId: string
    tenantId?: string
    platformId?: string
}

export type AuthenticateMicrosoftParams = {
    clientId: string
    clientSecret: string
    tenantId?: string
    authorizationCode: string
    platformId?: string
}

export const microsoftAuthnProvider = (log: FastifyBaseLogger) => ({
    async getLoginUrl(params: GetMicrosoftLoginUrlParams): Promise<string> {
        const { clientId, tenantId } = params
        const tenant = tenantId || 'common'
        const loginUrl = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`)
        loginUrl.searchParams.set('client_id', clientId)
        loginUrl.searchParams.set(
            'redirect_uri',
            await federatedAuthnService(log).getThirdPartyRedirectUrl(),
        )
        loginUrl.searchParams.set('scope', 'openid email profile offline_access User.Read')
        loginUrl.searchParams.set('response_type', 'code')
        loginUrl.searchParams.set('response_mode', 'query')
        loginUrl.searchParams.set('prompt', 'select_account')

        return loginUrl.href
    },

    async authenticate(
        params: AuthenticateMicrosoftParams,
    ): Promise<MicrosoftUserProfile> {
        const { clientId, clientSecret, tenantId, authorizationCode } = params
        const tenant = tenantId || 'common'
        const redirectUri = await federatedAuthnService(log).getThirdPartyRedirectUrl()

        // 1. Exchange authorization code for tokens
        const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code: authorizationCode,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        })

        const tokenData = (await tokenResponse.json()) as {
            access_token?: string
            id_token?: string
            error?: string
            error_description?: string
        }

        if (isNil(tokenData.access_token)) {
            log.error({ tokenData }, '[MicrosoftOAuth] Token exchange failed')
            throw new ActivepiecesError(
                {
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                },
                `Microsoft OAuth token exchange failed: ${tokenData.error_description || tokenData.error || 'no access_token returned'}`,
            )
        }

        // 2. Fetch user profile from Microsoft Graph API
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                Accept: 'application/json',
            },
        })

        if (!userResponse.ok) {
            log.error({ status: userResponse.status }, '[MicrosoftOAuth] Failed to fetch user profile from Microsoft Graph API')
            throw new ActivepiecesError(
                {
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                },
                'Failed to fetch user profile from Microsoft Graph',
            )
        }

        const userData = (await userResponse.json()) as {
            displayName?: string | null
            givenName?: string | null
            surname?: string | null
            mail?: string | null
            userPrincipalName?: string | null
            id: string
        }

        const email = (userData.mail || userData.userPrincipalName || '').toLowerCase().trim()
        if (!email) {
            throw new ActivepiecesError(
                {
                    code: ErrorCode.INVALID_CREDENTIALS,
                    params: null,
                },
                'No email associated with Microsoft account',
            )
        }

        // 3. Try fetching user photo from Microsoft Graph
        let imageUrl: string | undefined = undefined
        try {
            const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                },
            })
            if (photoResponse.ok) {
                const arrayBuffer = await photoResponse.arrayBuffer()
                const base64 = Buffer.from(arrayBuffer).toString('base64')
                const contentType = photoResponse.headers.get('content-type') || 'image/jpeg'
                imageUrl = `data:${contentType};base64,${base64}`
            }
        } catch {
            // Photo is optional
        }

        const firstName = userData.givenName || (userData.displayName ? userData.displayName.split(' ')[0] : 'User')
        const lastName = userData.surname || (userData.displayName ? userData.displayName.split(' ').slice(1).join(' ') : 'User')

        return {
            email,
            firstName,
            lastName,
            imageUrl,
        }
    },
})
