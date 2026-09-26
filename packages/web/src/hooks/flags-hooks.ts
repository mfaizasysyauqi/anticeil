import { ApFlagId } from '@activepieces/shared';
import { useSuspenseQuery } from '@tanstack/react-query';

import { flagsApi, FlagsMap } from '../api/flags-api';

type WebsiteBrand = {
  websiteName: string;
  logos: {
    fullLogoUrl: string;
    favIconUrl: string;
    logoIconUrl: string;
  };
  colors: {
    avatar: string;
    'blue-link': string;
    danger: string;
    selection: string;
    primary: {
      default: string;
      dark: string;
      light: string;
      medium: string;
    };
    warn: {
      default: string;
      light: string;
      dark: string;
    };
    success: {
      default: string;
      light: string;
    };
  };
};
const DEFAULT_BRANDING: WebsiteBrand = {
  websiteName: 'Anticeil',
  logos: {
    fullLogoUrl: '/logo.png',
    favIconUrl: '/logo.png',
    logoIconUrl: '/logo.png',
  },
  colors: {
    avatar: '#0d9488',
    'blue-link': '#0d9488',
    danger: '#ef4444',
    selection: '#0d9488',
    primary: {
      default: '#0d9488',
      dark: '#0f766e',
      light: '#2dd4bf',
      medium: '#14b8a6',
    },
    warn: {
      default: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    success: {
      default: '#10b981',
      light: '#34d399',
    },
  },
};

const DEFAULT_FLAGS: Record<string, any> = {
  [ApFlagId.THEME]: DEFAULT_BRANDING,
  [ApFlagId.EMAIL_AUTH_ENABLED]: false,
  [ApFlagId.EMAIL_CODE_AUTH_ENABLED]: false,
  [ApFlagId.USER_CREATED]: true,
  [ApFlagId.THIRD_PARTY_AUTH_PROVIDERS_TO_SHOW_MAP]: {
    google: true,
    github: false,
    saml: false,
  },
  [ApFlagId.THIRD_PARTY_AUTH_PROVIDER_REDIRECT_URL]: 'https://anticeil.com/redirect',
};

const queryKey = ['flags'];
export const flagsHooks = {
  queryKey,
  useFlags: () => {
    return useSuspenseQuery<FlagsMap, Error>({
      queryKey,
      queryFn: async () => {
        try {
          const res = await flagsApi.getAll();
          return { ...DEFAULT_FLAGS, ...res };
        } catch {
          return DEFAULT_FLAGS;
        }
      },
      staleTime: Infinity,
    });
  },
  useWebsiteBranding: (): WebsiteBrand => {
    return DEFAULT_BRANDING;
  },
  useFlag: <T>(flagId: ApFlagId) => {
    try {
      const query = useSuspenseQuery<FlagsMap, Error>({
        queryKey: ['flags'],
        queryFn: async () => {
          try {
            const res = await flagsApi.getAll();
            return { ...DEFAULT_FLAGS, ...res };
          } catch {
            return DEFAULT_FLAGS;
          }
        },
        staleTime: Infinity,
      });
      const data = (query.data?.[flagId] ?? DEFAULT_FLAGS[flagId] ?? null) as T | null;
      return {
        data,
      };
    } catch {
      return {
        data: (DEFAULT_FLAGS[flagId] ?? null) as T | null,
      };
    }
  },
};
