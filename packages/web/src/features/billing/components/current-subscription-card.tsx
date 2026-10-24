import { PlatformBillingInformation } from '@activepieces/shared';
import { t } from 'i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { billingUtils } from '../utils/billing-utils';

type CurrentSubscriptionCardProps = {
  info: PlatformBillingInformation;
  onExplorePlans: () => void;
};

export const CurrentSubscriptionCard = ({
  info,
  onExplorePlans,
}: CurrentSubscriptionCardProps) => {
  const isPaid = billingUtils.isPaidPlan(info.plan.plan);
  const isYearly = billingUtils.isYearlyPlan(info);

  return (
    <div className="flex flex-col justify-between gap-6 rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-muted-foreground">
            {t('Current plan')}
          </span>
          <span className="text-2xl font-bold text-foreground">
            {planTitle(info)}
          </span>
        </div>
        {isPaid && (
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 text-xs font-medium border-border text-muted-foreground bg-muted/40"
          >
            {isYearly ? t('Yearly') : t('Monthly')}
          </Badge>
        )}
      </div>
      <Button
        className="w-full font-semibold"
        onClick={onExplorePlans}
      >
        {t('Upgrade')}
      </Button>
    </div>
  );
};

function planTitle(info: PlatformBillingInformation): string {
  if (!billingUtils.isPaidPlan(info.plan.plan)) {
    return t('Free plan');
  }
  return t('{plan} plan', { plan: info.autumnPlanName ?? info.plan.plan });
}
