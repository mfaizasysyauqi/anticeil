import {
    FederatedAuthnLoginResponse,
    ThirdPartyAuthnProviderEnum,
    UserIdentityProvider,
} from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { AuthenticationResult } from '../../../authentication/authentication-utils'
import { authenticationService } from '../../../authentication/authentication.service'
import { domainHelper } from '../../../helper/domain-helper'
import { system } from '../../../helper/system/system'
import { AppSystemProp } from '../../../helper/system/system-props'
import { googleAuthnProvider } from './google-authn-provider'
import { githubAuthnProvider } from './github-authn-provider'

export const federatedAuthnService = (log: FastifyBaseLogger) => ({
    async login({
        providerName,
        platformId,
    }: LoginParams): Promise<FederatedAuthnLoginResponse> {
        if (providerName === ThirdPartyAuthnProviderEnum.GITHUB) {
            const { clientId } = getGithubClientIdAndSecret()
            const loginUrl = await githubAuthnProvider(log).getLoginUrl({
                clientId,
                platformId,
            })
            return {
                loginUrl,
            }
        }

        const { clientId } = getGoogleClientIdAndSecret()
        const loginUrl = await googleAuthnProvider(log).getLoginUrl({
            clientId,
            platformId,
        })

        return {
            loginUrl,
        }
    },

    async claim({
        providerName,
        platformId,
        code,
    }: ClaimParams): Promise<AuthenticationResult> {
        if (providerName === ThirdPartyAuthnProviderEnum.GITHUB) {
            const { clientId, clientSecret } = getGithubClientIdAndSecret()
            const profile = await githubAuthnProvider(log).authenticate({
                clientId,
                clientSecret,
                authorizationCode: code,
                platformId,
            })

            return authenticationService(log).federatedAuthn({
                email: profile.email,
                firstName: profile.firstName ?? 'GitHub',
                lastName: profile.lastName ?? '',
                trackEvents: true,
                newsLetter: true,
                provider: UserIdentityProvider.GITHUB,
                predefinedPlatformId: platformId ?? null,
                imageUrl: profile.imageUrl,
            })
        }

        const { clientId, clientSecret } = getGoogleClientIdAndSecret()
        const idToken = await googleAuthnProvider(log).authenticate({
            clientId,
            clientSecret,
            authorizationCode: code,
            platformId,
        })

        return authenticationService(log).federatedAuthn({
            email: idToken.email,
            firstName: idToken.firstName ?? 'john',
            lastName: idToken.lastName ?? 'doe',
            trackEvents: true,
            newsLetter: true,
            provider: UserIdentityProvider.GOOGLE,
            predefinedPlatformId: platformId ?? null,
            imageUrl: idToken.imageUrl,
        })
    },
    async getThirdPartyRedirectUrl(): Promise<string> {
        return domainHelper.getInternalUrl({
            path: '/redirect',
        })
    },
})

function getGoogleClientIdAndSecret() {
    return {
        clientId: system.getOrThrow(AppSystemProp.GOOGLE_CLIENT_ID),
        clientSecret: system.getOrThrow(AppSystemProp.GOOGLE_CLIENT_SECRET),
    }
}

function getGithubClientIdAndSecret() {
    return {
        clientId: system.getOrThrow(AppSystemProp.GITHUB_CLIENT_ID),
        clientSecret: system.getOrThrow(AppSystemProp.GITHUB_CLIENT_SECRET),
    }
}

type LoginParams = {
    providerName?: ThirdPartyAuthnProviderEnum
    platformId: string | undefined
}

type ClaimParams = {
    providerName?: ThirdPartyAuthnProviderEnum
    platformId: string | undefined
    code: string
}
