export enum ThirdPartyAuthnProviderEnum {
    GOOGLE = 'google',
    GITHUB = 'github',
    MICROSOFT = 'microsoft',
    OKTA = 'okta',
    SAML = 'saml',
}

export type ThirdPartyAuthnProvidersToShowMap = {
    [k in ThirdPartyAuthnProviderEnum]?: boolean;
}