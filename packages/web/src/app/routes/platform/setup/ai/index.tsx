import { PlatformRole } from '@activepieces/shared';
import { t } from 'i18next';
import { Navigate } from 'react-router-dom';

import { userHooks } from '@/hooks/user-hooks';
import { LockedFeatureGuard } from '../../../../components/locked-feature-guard';

import { CapabilitiesTab } from './capabilities-tab';
import { ProvidersTab } from './providers-tab';

export default function AIProvidersPage() {
  const { data: currentUser } = userHooks.useCurrentUser();

  return (
    <LockedFeatureGuard
      featureKey="UNIVERSAL_AI"
      locked={currentUser?.platformRole !== PlatformRole.ADMIN}
      lockTitle={t('Unlock AI')}
      lockDescription={t(
        'Set your AI providers so your users enjoy a seamless building experience with our universal AI pieces',
      )}
    >
      <div className="flex min-h-full w-full max-w-6xl flex-col px-8 py-6">
        <ProvidersTab />
      </div>
    </LockedFeatureGuard>
  );
}

export function AICapabilitiesPage() {
  const { data: currentUser } = userHooks.useCurrentUser();

  return (
    <LockedFeatureGuard
      featureKey="UNIVERSAL_AI"
      locked={currentUser?.platformRole !== PlatformRole.ADMIN}
      lockTitle={t('Unlock AI')}
      lockDescription={t(
        'Set your AI providers so your users enjoy a seamless building experience with our universal AI pieces',
      )}
    >
      <div className="flex min-h-full w-full max-w-6xl flex-col px-8 py-6">
        <CapabilitiesTab />
      </div>
    </LockedFeatureGuard>
  );
}


