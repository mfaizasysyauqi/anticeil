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
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const isCloud = edition === ApEdition.CLOUD;
  return {
    google: Boolean(thirdPartyAuthProviders?.google),
    saml: isCloud || Boolean(thirdPartyAuthProviders?.saml),
    samlIsCloud: isCloud,
  };
}

function useShowThirdPartyProviders(): boolean {
  const { google, saml } = useThirdPartyAvailability();
  return google || saml;
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
      availability.google || (!hideSaml && availability.saml);
    const [isLoading, setIsLoading] = useState(false);

    const handleProviderClick = async (
      event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
      providerName: ThirdPartyAuthnProviderEnum,
    ) => {
      event.preventDefault();
      event.stopPropagation();
      setIsLoading(true);
      capture({
        name: TelemetryEventName.FEDERATED_LOGIN_STARTED,
        payload: {
          provider:
            providerName === ThirdPartyAuthnProviderEnum.GOOGLE
              ? 'google'
              : 'saml',
        },
      });
      try {
        const { loginUrl } = await authenticationApi.getFederatedAuthLoginUrl(
          providerName,
        );

        if (!loginUrl || !thirdPartyRedirectUrl) {
          internalErrorToast();
          setIsLoading(false);
          return;
        }
        thirdPartyLogin(loginUrl, providerName);
      } catch (err) {
        setIsLoading(false);
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
            <span>{t('Keamanan resmi Google OAuth 2.0')}</span>
          </div>
          <div className="flex items-center gap-2.5 text-foreground/90">
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            <span>{t('Terhubung langsung ke kuota AI & workspace Anticeil')}</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        {thirdPartyAuthProviders?.google && (
          <Button
            variant="outline"
            className="h-12 w-full gap-3 rounded-xl border-border bg-background text-[14px] font-semibold text-foreground shadow-sm transition-all hover:bg-accent hover:border-border-strong active:scale-[0.99] cursor-pointer"
            disabled={isLoading}
            onClick={(e) =>
              handleProviderClick(e, ThirdPartyAuthnProviderEnum.GOOGLE)
            }
          >
            {isLoading ? (
              <Loader2 className="size-4.5 animate-spin" />
            ) : (
              <GoogleLogoIcon />
            )}
            <span>{t('Lanjutkan dengan Google')}</span>
          </Button>
        )}

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
              ? `${t('Sign up with')} SAML`
              : `${t('Sign in with')} SAML`}
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
              ? `${t('Sign up with')} SAML`
              : `${t('Sign in with')} SAML`}
          </Button>
        )}

        {/* Trust & Privacy Notice */}
        <p className="mt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
          {t(
            'Dengan melanjutkan, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi Anticeil. 100% Aman & Bebas Password.',
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
  saml: boolean;
  samlIsCloud: boolean;
};
