export enum ThirdPartyAuthnProviderEnum {
    GOOGLE = 'google',
    GITHUB = 'github',
    MICROSOFT = 'microsoft',
    SAML = 'saml',
}

export type ThirdPartyAuthnProvidersToShowMap = {
    [k in ThirdPartyAuthnProviderEnum]?: boolean;
}