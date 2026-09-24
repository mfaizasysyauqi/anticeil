import {
  ApEdition,
  ApFlagId,
  ThirdPartyAuthnProviderEnum,
  ThirdPartyAuthnProvidersToShowMap,
  TelemetryEventName,
} from '@activepieces/shared';
import { t } from 'i18next';
import { Loader2, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import React, { useState } from 'react';

import { authenticationApi } from '@/api/authentication-api';
import SamlIcon from '@/assets/img/custom/auth/saml.svg';
import { useTelemetry } from '@/components/providers/telemetry-provider';
import { Button } from '@/components/ui/button';
import { internalErrorToast } from '@/components/ui/sonner';
import { oauth2Utils } from '@/features/connections/utils/oauth2-utils';
import { flagsHooks } from '@/hooks/flags-hooks';

function useThirdPartyAvailability(): ThirdPartyAvailability {
  const { data: thirdPartyAuthProviders } =
    flagsHooks.useFlag<ThirdPartyAuthnProvidersToShowMap>(
      ApFlagId.THIRD_PARTY_AUTH_PROVIDERS_TO_SHOW_MAP,
    );
  const { data: emailAuthEnabledFlag } = flagsHooks.useFlag<boolean>(
    ApFlagId.EMAIL_AUTH_ENABLED,
  );
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const isCloud = edition === ApEdition.CLOUD;
  const emailAuthEnabled = emailAuthEnabledFlag ?? false;
  const hasSpecificConfig =
    thirdPartyAuthProviders?.google !== undefined ||
    thirdPartyAuthProviders?.github !== undefined;

  const defaultShow = !emailAuthEnabled && !hasSpecificConfig;

  return {
    google: false,
    github: Boolean(thirdPartyAuthProviders?.github) || defaultShow || true,
    saml: isCloud || Boolean(thirdPartyAuthProviders?.saml),
    samlIsCloud: isCloud,
  };
}

function useShowThirdPartyProviders(): boolean {
  const { google, github, saml } = useThirdPartyAvailability();
  return google || github || saml;
}

const GoogleLogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const GithubLogoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

const ThirdPartyLogin = React.memo(
  ({
    isSignUp,
    onSamlClick,
    hideSaml = false,
  }: {
    isSignUp: boolean;
    onSamlClick: () => void;
    hideSaml?: boolean;
  }) => {
    const { data: thirdPartyAuthProviders } =
      flagsHooks.useFlag<ThirdPartyAuthnProvidersToShowMap>(
        ApFlagId.THIRD_PARTY_AUTH_PROVIDERS_TO_SHOW_MAP,
      );
    const { data: thirdPartyRedirectUrl } = flagsHooks.useFlag<string>(
      ApFlagId.THIRD_PARTY_AUTH_PROVIDER_REDIRECT_URL,
    );
    const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
    const isCloud = edition === ApEdition.CLOUD;
    const thirdPartyLogin = oauth2Utils.useThirdPartyLogin();
    const { capture } = useTelemetry();
    const availability = useThirdPartyAvailability();
    const showProviders =
      availability.google || availability.github || (!hideSaml && availability.saml);
    const [loadingProvider, setLoadingProvider] =
      useState<ThirdPartyAuthnProviderEnum | null>(null);

    const handleProviderClick = async (
      event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
      providerName: ThirdPartyAuthnProviderEnum,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      setLoadingProvider(providerName);
      capture({
        name: TelemetryEventName.FEDERATED_LOGIN_STARTED,
        payload: {
          provider: providerName,
        },
      });
      try {
        const { loginUrl } = await authenticationApi.getFederatedAuthLoginUrl(
          providerName,
        );

        if (!loginUrl || !thirdPartyRedirectUrl) {
          internalErrorToast();
          setLoadingProvider(null);
          return;
        }
        thirdPartyLogin(loginUrl, providerName);
      } catch (err) {
        setLoadingProvider(null);
        internalErrorToast();
      }
    };

    if (!showProviders) {
      return null;
    }

    return (
      <div className="flex flex-col gap-4.5">
        {/* Anticeil Value Highlights */}
        <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/40 p-3.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5 text-foreground/90">
            <Zap className="size-3.5 shrink-0 text-amber-500" />
            <span>{t('Login instan 1-klik tanpa repot mengingat password')}</span>
          </div>
          <div className="flex items-center gap-2.5 text-foreground/90">
            <ShieldCheck className="size-3.5 shrink-0 text-emerald-500" />
            <span>{t('Official OAuth 2.0 security via GitHub')}</span>
          </div>
          <div className="flex items-center gap-2.5 text-foreground/90">
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            <span>{t('Bring your own API key, full control without subscription')}</span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-2.5">
          {availability.google && (
            <Button
              variant="outline"
              className="h-12 w-full gap-3 rounded-xl border-border bg-background text-[14px] font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:border-border-strong active:scale-[0.99] cursor-pointer"
              disabled={loadingProvider !== null}
              onClick={(e) =>
                handleProviderClick(e, ThirdPartyAuthnProviderEnum.GOOGLE)
              }
            >
              {loadingProvider === ThirdPartyAuthnProviderEnum.GOOGLE ? (
                <Loader2 className="size-4.5 animate-spin" />
              ) : (
                <GoogleLogoIcon />
              )}
              <span>{t('Continue with Google')}</span>
            </Button>
          )}

          {availability.github && (
            <Button
              variant="outline"
              className="h-12 w-full gap-3 rounded-xl border-border bg-background text-[14px] font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:border-border-strong active:scale-[0.99] cursor-pointer"
              disabled={loadingProvider !== null}
              onClick={(e) =>
                handleProviderClick(e, ThirdPartyAuthnProviderEnum.GITHUB)
              }
            >
              {loadingProvider === ThirdPartyAuthnProviderEnum.GITHUB ? (
                <Loader2 className="size-4.5 animate-spin" />
              ) : (
                <GithubLogoIcon />
              )}
              <span>{t('Continue with GitHub')}</span>
            </Button>
          )}
        </div>

        {/* SAML SSO Option (If Configured) */}
        {!hideSaml && isCloud && (
          <Button
            variant="ghost"
            className="h-10 w-full gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              capture({
                name: TelemetryEventName.FEDERATED_LOGIN_STARTED,
                payload: { provider: 'saml' },
              });
              onSamlClick();
            }}
          >
            <img src={SamlIcon} alt="SAML" width={16} height={16} />
            {isSignUp
              ? t('Sign up with SAML')
              : t('Sign in with SAML')}
          </Button>
        )}

        {!hideSaml && !isCloud && thirdPartyAuthProviders?.saml && (
          <Button
            variant="ghost"
            className="h-10 w-full gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              capture({
                name: TelemetryEventName.FEDERATED_LOGIN_STARTED,
                payload: { provider: 'saml' },
              });
              window.location.href = '/api/v1/authn/saml/login';
            }}
          >
            <img src={SamlIcon} alt="SAML" width={16} height={16} />
            {isSignUp
              ? t('Sign up with SAML')
              : t('Sign in with SAML')}
          </Button>
        )}

        {/* Trust & Privacy Notice */}
        <p className="mt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
          {t(
            'By continuing, you agree to the Terms of Service & Privacy Policy. 100% Secure & Passwordless.',
          )}
        </p>
      </div>
    );
  },
);

ThirdPartyLogin.displayName = 'ThirdPartyLogin';

export {
  ThirdPartyLogin,
  useShowThirdPartyProviders,
  useThirdPartyAvailability,
};

type ThirdPartyAvailability = {
  google: boolean;
  github: boolean;
  saml: boolean;
  samlIsCloud: boolean;
};

