import { PlatformRole } from '@activepieces/shared';
import { t } from 'i18next';

import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';
import { LockedFeatureGuard } from '../../../../components/locked-feature-guard';

import { CapabilitiesTab } from './capabilities-tab';
import { ProvidersTab } from './providers-tab';

export default function AIProvidersPage() {
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: currentUser } = userHooks.useCurrentUser();

  return (
    <LockedFeatureGuard
      featureKey="UNIVERSAL_AI"
      locked={currentUser?.platformRole !== PlatformRole.ADMIN || !platform.plan.aiProvidersEnabled}
      lockTitle={t('Unlock AI Providers')}
      lockDescription={t(
        'Set your AI providers so your users enjoy a seamless building experience with our universal AI pieces',
      )}
    >
      <div className="flex min-h-full w-full flex-col px-8 py-6">
        <ProvidersTab />
      </div>
    </LockedFeatureGuard>
  );
}

export function AICapabilitiesPage() {
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: currentUser } = userHooks.useCurrentUser();

  return (
    <LockedFeatureGuard
      featureKey="UNIVERSAL_AI"
      locked={currentUser?.platformRole !== PlatformRole.ADMIN || !platform.plan.aiProvidersEnabled}
      lockTitle={t('Unlock AI Capabilities')}
      lockDescription={t(
        'Configure AI capabilities and tools for your automations.',
      )}
    >
      <div className="flex min-h-full w-full flex-col px-8 py-6">
        <CapabilitiesTab />
      </div>
    </LockedFeatureGuard>
  );
}


