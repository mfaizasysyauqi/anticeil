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
    fullLogoUrl: '/logo.svg',
    favIconUrl: '/logo.svg',
    logoIconUrl: '/logo.svg',
  },
  colors: {
    avatar: '#6366f1',
    'blue-link': '#3b82f6',
    danger: '#ef4444',
    selection: '#3b82f6',
    primary: {
      default: '#6366f1',
      dark: '#4f46e5',
      light: '#818cf8',
      medium: '#6366f1',
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

const queryKey = ['flags'];
export const flagsHooks = {
  queryKey,
  useFlags: () => {
    return useSuspenseQuery<FlagsMap, Error>({
      queryKey,
      queryFn: flagsApi.getAll,
      staleTime: Infinity,
    });
  },
  useWebsiteBranding: (): WebsiteBrand => {
    const { data: theme } = flagsHooks.useFlag<WebsiteBrand>(ApFlagId.THEME);
    return theme || DEFAULT_BRANDING;
  },
  useFlag: <T>(flagId: ApFlagId) => {
    try {
      const query = useSuspenseQuery<FlagsMap, Error>({
        queryKey: ['flags'],
        queryFn: flagsApi.getAll,
        staleTime: Infinity,
      });
      const data = query.data?.[flagId] as T | null;
      return {
        data,
      };
    } catch {
      return {
        data: null,
      };
    }
  },
};
