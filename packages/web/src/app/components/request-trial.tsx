import { isNil } from '@activepieces/core-utils';
import { UserWithMetaInformation } from '@activepieces/shared';
import { t } from 'i18next';

import { AnimatedIconButton } from '@/components/custom/animated-icon-button';
import { SendIcon } from '@/components/icons/send';
import { userHooks } from '@/hooks/user-hooks';
import { telemetryUtils } from '@/lib/telemetry-utils';

export const RequestTrial = ({
  featureKey,
  buttonVariant = 'default',
  buttonSize = 'default',
}: RequestTrialProps) => {
  const { data: currentUser } = userHooks.useCurrentUser();

  const handleClick = () =>
    window.open(
      buildSalesUrl({ currentUser, featureKey }),
      '_blank',
      'noopener noreferrer',
    );

  return (
    <AnimatedIconButton
      variant={buttonVariant}
      size={buttonSize}
      onClick={handleClick}
      icon={SendIcon}
      iconSize={14}
    >
      {t('Contact Sales')}
    </AnimatedIconButton>
  );
};

function buildSalesUrl({
  currentUser,
  featureKey,
}: {
  currentUser: UserWithMetaInformation | null | undefined;
  featureKey: FeatureKey;
}): string {
  const message = `Halo Anticeil, saya tertarik untuk beralih ke paket Enterprise (${featureKey}). Email: ${currentUser?.email ?? ''}`;
  return `https://wa.me/62882000221551?text=${encodeURIComponent(message)}`;
}

const SALES_URL = 'https://wa.me/62882000221551';

export type FeatureKey =
  | 'PROJECTS'
  | 'BRANDING'
  | 'PIECES'
  | 'TEMPLATES'
  | 'TEAM'
  | 'GLOBAL_CONNECTIONS'
  | 'USERS'
  | 'EVENT_DESTINATIONS'
  | 'API'
  | 'SSO'
  | 'AUDIT_LOGS'
  | 'ENVIRONMENT'
  | 'ISSUES'
  | 'ANALYTICS'
  | 'ALERTS'
  | 'ENTERPRISE_PIECES'
  | 'UNIVERSAL_AI'
  | 'SIGNING_KEYS'
  | 'CUSTOM_ROLES'
  | 'AGENTS'
  | 'TABLES'
  | 'TODOS'
  | 'BILLING'
  | 'MCPS'
  | 'SECRET_MANAGERS'
  | 'DEDICATED_WORKERS';

type RequestTrialProps = {
  featureKey: FeatureKey;
  customButton?: React.ReactNode;
  buttonVariant?: 'default' | 'basic';
  buttonSize?: 'default' | 'sm' | 'xs';
};
