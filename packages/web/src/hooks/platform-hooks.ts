import { isNil } from '@activepieces/core-utils';
import { PlatformWithoutSensitiveData } from '@activepieces/shared';
import {
  QueryClient,
  useMutation,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { t } from 'i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { platformApi } from '@/api/platforms-api';
import { authenticationSession } from '@/lib/authentication-session';

import { flagsHooks } from './flags-hooks';

export function normalizePlatformPlan(
  platform: PlatformWithoutSensitiveData,
): PlatformWithoutSensitiveData {
  if (!platform?.plan) return platform;
  const rawPlan = (platform.plan.plan || 'free').toLowerCase();
  const isEnterprise = rawPlan.includes('enterprise');
  const isTeam = rawPlan.includes('team') || isEnterprise;
  const isPlus = rawPlan.includes('plus') || isTeam;

  return {
    ...platform,
    plan: {
      ...platform.plan,
      plan: isEnterprise ? 'enterprise' : (isTeam ? 'team' : (isPlus ? 'plus' : 'free')),
      agentsEnabled: true,
      aiProvidersEnabled: true,
      chatEnabled: true,
      tablesEnabled: true,
      analyticsEnabled: true,

      customAppearanceEnabled: isPlus || !!platform.plan.customAppearanceEnabled,
      showPoweredBy: isPlus ? false : platform.plan.showPoweredBy,
      auditLogEnabled: isPlus || !!platform.plan.auditLogEnabled,
      apiKeysEnabled: isPlus || !!platform.plan.apiKeysEnabled,

      globalConnectionsEnabled: isTeam || !!platform.plan.globalConnectionsEnabled,
      ssoEnabled: isTeam || !!platform.plan.ssoEnabled,
      customRolesEnabled: isTeam || !!platform.plan.customRolesEnabled,
      projectRolesEnabled: isTeam || !!platform.plan.projectRolesEnabled,
      environmentsEnabled: isTeam || !!platform.plan.environmentsEnabled,
      embeddingEnabled: isTeam || !!platform.plan.embeddingEnabled,
      secretManagersEnabled: isTeam || !!platform.plan.secretManagersEnabled,
      managePiecesEnabled: isTeam || !!platform.plan.managePiecesEnabled,
      manageTemplatesEnabled: isTeam || !!platform.plan.manageTemplatesEnabled,
      billedTeamProjectsLimit: isTeam
        ? null
        : (isPlus ? Math.max(1, platform.plan.billedTeamProjectsLimit ?? 1) : platform.plan.billedTeamProjectsLimit),
      usersLimit: isEnterprise ? null : (isTeam ? 25 : (isPlus ? 5 : 1)),

      scimEnabled: isEnterprise || !!platform.plan.scimEnabled,
      eventStreamingEnabled: isEnterprise || !!platform.plan.eventStreamingEnabled,
      workerGroupsEnabled: isEnterprise || !!platform.plan.workerGroupsEnabled,
      customDomainsEnabled: isEnterprise || !!platform.plan.customDomainsEnabled,
    },
  };
}

export const platformHooks = {
  useDeletePlatform: () => {
    const navigate = useNavigate();
    return useMutation({
      mutationFn: async () => {
        await platformApi.deletePlatform();
      },
      onSuccess: () => {
        toast.success(t('Platform deleted successfully'));
        navigate('/sign-in');
      },
      onError: () => {
        toast.error(t('Failed to delete platform. Please try again.'));
      },
    });
  },
  useCurrentPlatform: () => {
    const currentPlatformId = authenticationSession.getPlatformId();
    const query = useSuspenseQuery({
      queryKey: ['platform', currentPlatformId],
      queryFn: async () => {
        if (!currentPlatformId) {
          return null as any;
        }
        const data = await platformApi.getCurrentPlatform();
        return normalizePlatformPlan(data);
      },
      staleTime: 10 * 1000,
    });
    return {
      platform: normalizePlatformPlan(query.data),
      refetch: async () => {
        await query.refetch();
      },
      setCurrentPlatform: (
        queryClient: QueryClient,
        platform: PlatformWithoutSensitiveData,
      ) => {
        const normalized = normalizePlatformPlan(platform);
        queryClient.setQueryData(['platform', currentPlatformId], normalized);
      },
    };
  },
  useUpdateLisenceKey: ({
    queryClient,
    messages,
  }: UseUpdateLicenseKeyParams) => {
    const currentPlatformId = authenticationSession.getPlatformId();

    return useMutation({
      mutationFn: async (tempLicenseKey: string) => {
        if (tempLicenseKey.trim() === '') return;
        await platformApi.activateLicenseKey(tempLicenseKey.trim());
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['platform', currentPlatformId],
        });
        queryClient.invalidateQueries({
          queryKey: flagsHooks.queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: ['platform-billing-subscription'],
        });
        const successMessage =
          messages?.success === undefined
            ? t('License activated successfully!')
            : messages.success;
        if (!isNil(successMessage)) {
          toast.success(successMessage);
        }
      },
      onError: () => {
        const errorMessage =
          messages?.error === undefined
            ? t('Activation failed, invalid license key')
            : messages.error;
        if (!isNil(errorMessage)) {
          toast.error(errorMessage);
        }
      },
    });
  },
};

export type UseUpdateLicenseKeyParams = {
  queryClient: QueryClient;
  messages?: {
    success?: string | null;
    error?: string | null;
  };
};
