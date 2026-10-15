import { t } from 'i18next';

import { AdminPageHeader, adminPageResources } from '@/app/components/admin';
import { AppearanceSection } from '@/app/routes/platform/setup/general/appearance-section';
import { platformHooks } from '@/hooks/platform-hooks';
import { userHooks } from '@/hooks/user-hooks';

import { DangerZoneSection } from './danger-zone-section';

export const GeneralPage = () => {
  const { platform } = platformHooks.useCurrentPlatform();
  const { data: user } = userHooks.useCurrentUser();

  const canDeletePlatform = platform.ownerId === user?.id;

  return (
    <AppearanceSection
      header={
        <AdminPageHeader
          title={t('General')}
          description={t('Your platform name, branding and general settings.')}
          resources={adminPageResources.general}
        />
      }
    >
      {canDeletePlatform && <DangerZoneSection platformName={platform.name} />}
    </AppearanceSection>
  );
};
