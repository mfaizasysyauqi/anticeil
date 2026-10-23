import { isNil } from '@activepieces/core-utils';
import { PlatformUsage } from '@activepieces/shared';

import { useIsPlatformAdmin } from '@/hooks/authorization-hooks';
import { platformHooks } from '@/hooks/platform-hooks';

import { billingUtils, CreditsSeverity } from '../utils/billing-utils';

export function useCreditsUsage(): CreditsUsage {
  const { platform } = platformHooks.useCurrentPlatform();
  const isPlatformAdmin = useIsPlatformAdmin();

  if (!platform) {
    return {
      platformId: '',
      usage: undefined,
      isPlatformAdmin: false,
      isPaid: false,
      isBillingEnforced: false,
      creditsRemaining: null,
      isUnlimited: true,
      percentUsed: 0,
      severity: 'default',
    };
  }

  const usage = platform.usage;
  const planCredits = platform.plan?.includedCredits;
  const creditsUsed = Math.round(usage?.creditsUsed ?? 0);
  const creditsRemaining = !isNil(planCredits)
    ? Math.max(0, planCredits - creditsUsed)
    : (usage?.creditsRemaining ?? null);
  const isUnlimited = isNil(creditsRemaining);
  const total = isUnlimited
    ? 0
    : (!isNil(planCredits) ? planCredits : creditsUsed + Math.round(creditsRemaining));
  const percentUsed = billingUtils.percentUsed({ used: creditsUsed, total });

  return {
    platformId: platform.id,
    usage: usage
      ? {
          ...usage,
          creditsRemaining,
          creditsUsed,
        }
      : undefined,
    isPlatformAdmin,
    isPaid: billingUtils.isPaidPlan(platform.plan.plan),
    isBillingEnforced: platform.billingEnforced === true,
    creditsRemaining,
    isUnlimited,
    percentUsed,
    severity: billingUtils.creditsSeverity(percentUsed),
  };
}

export type CreditsUsage = {
  platformId: string;
  usage: PlatformUsage | undefined;
  isPlatformAdmin: boolean;
  isPaid: boolean;
  isBillingEnforced: boolean;
  creditsRemaining: number | null;
  isUnlimited: boolean;
  percentUsed: number;
  severity: CreditsSeverity;
};
