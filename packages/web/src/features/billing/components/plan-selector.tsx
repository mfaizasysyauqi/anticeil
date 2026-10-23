import { isNil } from '@activepieces/core-utils';
import { PurchasablePlan } from '@activepieces/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import i18next, { t } from 'i18next';
import { Check, Info, Minus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { platformHooks } from '@/hooks/platform-hooks';
import { cn } from '@/lib/utils';

import { platformBillingApi } from '../api/billing-plans-api';
import { billingQueries } from '../hooks/billing-hooks';
import { useCancelSubscriptionGuard } from '../hooks/use-cancel-subscription-guard';
import { usePlanSeatFloorGuard } from '../hooks/use-plan-seat-floor-guard';

import { CancelSubscriptionDialog } from './cancel-subscription-dialog';
import { KeepPlanDialog } from './keep-plan-dialog';
import { usePlanSwitchSuccessDialogStore } from '../stores/plan-switch-success-dialog-state';
import {
  billingKeys,
  PLATFORM_BILLING_SUBSCRIPTION_KEY,
  refreshBillingCaches,
} from '../hooks/billing-hooks';
import {
  planSelectorUtils,
  type BillingCycle,
  type CheckoutAction,
  type PlanCatalogEntry,
  type PlanPricing,
} from './plan-selector-utils';

// Anticeil Native feature comparison table: feature rows with ✓ / — per plan
const COMPARISON_ROWS: {
  label: string;
  tooltip?: string;
  values: (string | boolean)[];
}[] = [
  {
    label: 'AI Credits',
    values: ['1,000/mo', '10,000/mo', '50,000/mo', 'From 1M'],
  },
  {
    label: 'Automation Tasks',
    values: ['1,000/mo', '10,000/mo', '50,000/mo', 'Custom'],
  },
  {
    label: 'Team Members',
    values: ['1 seat', '5 seats', '25 seats', 'Unlimited'],
  },
  { label: 'Automation Flows', values: ['5 flows', '100 flows', 'Unlimited', 'Unlimited'] },
  { label: 'Webhooks & Triggers', values: [true, true, true, true] },
  { label: 'AI Agents Builder', values: [true, true, true, true] },
  { label: 'MCP Tools & Integration', values: [true, true, true, true] },
  { label: 'Impact Analytics', values: [true, true, true, true] },
  { label: 'BYOK (Bring Your Own Key)', values: [false, true, true, true] },
  { label: 'Team Projects', values: [false, '1 project', 'Unlimited', 'Unlimited'] },
  { label: 'Real-time Live Cursors & Presence', values: [false, true, true, true] },
  { label: 'Custom Appearance & Branding', values: [false, true, true, true] },
  { label: 'Anticeil Audit Logs', values: [false, true, true, true] },
  { label: 'API Keys & Developers', values: [false, true, true, true] },
  { label: 'Secret Managers (Vault / AWS / 1Password)', values: [false, false, true, true] },
  { label: 'Priority Queue Execution', values: [false, false, true, true] },
  { label: 'Custom Invoicing & Corporate PO', values: [false, false, false, true] },
  {
    label: 'Support & SLA',
    values: ['Community', 'Priority Email', 'Priority Support', '24/7 Dedicated VIP + SLA'],
  },
];

export function formatComparisonValue(val: string | boolean): string | boolean {
  if (typeof val !== 'string') return val;
  const isId = (t('language_marker', { defaultValue: '' }) === 'id') ||
    (typeof window !== 'undefined' && (
      document.documentElement.lang?.toLowerCase().startsWith('id') ||
      window.localStorage?.getItem('i18nextLng')?.toLowerCase().startsWith('id')
    )) ||
    (i18next.language || '').toLowerCase().startsWith('id');

  if (!isId) return val;

  const translated = t(val);
  if (translated !== val) return translated;

  return val
    .replace(/\/mo\b/gi, '/bln')
    .replace(/\bFrom\s+(\d+(?:\.\d+)?)M\b/gi, 'Dari $1jt')
    .replace(/\bFrom\s+(\d+(?:\.\d+)?)k\b/gi, 'Dari $1rb')
    .replace(/\b(\d+(?:\.\d+)?)M\b/g, '$1jt')
    .replace(/\b(\d+(?:\.\d+)?)k\b/g, '$1rb')
    .replace(/(\d+),(\d{3})/g, '$1.$2');
}

const DEFAULT_PURCHASABLE_PLANS: PurchasablePlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For individuals exploring automation',
    price: 0,
    interval: 'month',
    priceDisplay: 'Rp 0',
    baseVariantId: null,
    includedSeats: 1,
    includedCredits: 1000,
    creditsResetInterval: 'month',
  },
  {
    id: 'plus-monthly',
    name: 'Plus',
    description: 'For solo builders who automate regularly',
    price: 299000,
    interval: 'month',
    priceDisplay: 'Rp 299rb',
    baseVariantId: null,
    includedSeats: 5,
    includedCredits: 10000,
    creditsResetInterval: 'month',
  },
  {
    id: 'plus-annual',
    name: 'Plus (annual)',
    description: 'For solo builders who automate regularly',
    price: 2990000,
    interval: 'year',
    priceDisplay: 'Rp 2.99jt',
    baseVariantId: null,
    includedSeats: 5,
    includedCredits: 10000,
    creditsResetInterval: 'month',
  },
  {
    id: 'team-monthly',
    name: 'Team',
    description: 'For teams that collaborate on automations',
    price: 2990000,
    interval: 'month',
    priceDisplay: 'Rp 2.99jt',
    baseVariantId: null,
    includedSeats: 25,
    includedCredits: 50000,
    creditsResetInterval: 'month',
  },
  {
    id: 'team-annual',
    name: 'Team (annual)',
    description: 'For teams that collaborate on automations',
    price: 29900000,
    interval: 'year',
    priceDisplay: 'Rp 29.9jt',
    baseVariantId: null,
    includedSeats: 25,
    includedCredits: 50000,
    creditsResetInterval: 'month',
  },
];

export function PlanSelector({ enabled, onSelected }: PlanSelectorProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { platform, setCurrentPlatform } = platformHooks.useCurrentPlatform();
  const { data: plans, isLoading } = billingQueries.useListPlans(
    platform?.id ?? '',
    enabled && !isNil(platform?.id),
  );
  const { ensureSeatFloor, openSeatFloor, seatFloorDialog } =
    usePlanSeatFloorGuard();
  const { cancelWithSeatCheck, deactivateUsersDialog } =
    useCancelSubscriptionGuard({ onCanceled: onSelected });
  const [isKeepPlanOpen, setIsKeepPlanOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const { data: subscription } = billingQueries.usePlatformSubscription(
    platform?.id ?? '',
    enabled && !isNil(platform?.id),
  );

  const [isMidtransLoading, setIsMidtransLoading] = useState(false);

  // Loads Midtrans Snap.js once (sandbox or production)
  const loadSnapScript = useCallback(
    (clientKey: string): Promise<void> =>
      new Promise((resolve) => {
        if ((window as any).snap) {
          resolve();
          return;
        }
        const isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true';
        const src = isProduction
          ? 'https://app.midtrans.com/snap/snap.js'
          : 'https://app.sandbox.midtrans.com/snap/snap.js';
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          existing.addEventListener('load', () => resolve());
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.setAttribute('data-client-key', clientKey);
        script.onload = () => resolve();
        document.head.appendChild(script);
      }),
    [],
  );

  const { mutate: switchPlan, isPending: isSwitching } = useMutation({
    mutationFn: (plan: string) => platformBillingApi.switchPlan({ plan }),
    onSuccess: async (res) => {
      const targetPlanKey = res.plan;
      const isEnterprise = targetPlanKey === 'enterprise';
      const isTeam = targetPlanKey === 'team' || isEnterprise;
      const isPlus = targetPlanKey === 'plus' || isTeam;

      const updatedPlan = {
        ...platform.plan,
        plan: targetPlanKey,
        includedCredits: isEnterprise ? 1000000 : (isTeam ? 50000 : (isPlus ? 10000 : 1000)),
        usersLimit: isEnterprise ? null : (isTeam ? 25 : (isPlus ? 5 : 1)),
        activeFlowsLimit: isEnterprise ? null : (isTeam ? null : (isPlus ? 100 : 5)),
        projectsLimit: isEnterprise ? null : (isTeam ? null : (isPlus ? null : 1)),
        billedTeamProjectsLimit: isTeam ? null : (isPlus ? 1 : 0),

        agentsEnabled: true,
        aiProvidersEnabled: true,
        chatEnabled: true,
        tablesEnabled: true,
        analyticsEnabled: true,

        customAppearanceEnabled: isPlus,
        showPoweredBy: !isPlus,

        globalConnectionsEnabled: isTeam,
        ssoEnabled: isTeam,
        customRolesEnabled: isTeam,
        projectRolesEnabled: isTeam,
        auditLogEnabled: isPlus,
        environmentsEnabled: isTeam,
        embeddingEnabled: isTeam,
        apiKeysEnabled: isPlus,
        secretManagersEnabled: isTeam,
        managePiecesEnabled: isTeam,
        manageTemplatesEnabled: isTeam,

        scimEnabled: isEnterprise,
        eventStreamingEnabled: isEnterprise,
        workerGroupsEnabled: isEnterprise,
        customDomainsEnabled: isEnterprise,
        dedicatedWorkers: null,
        canary: false,
      };

      const planCreditsMap: Record<string, number> = {
        free: 1000,
        plus: 10000,
        team: 50000,
        enterprise: 1000000,
      };
      const newLimit = planCreditsMap[targetPlanKey] ?? 1000;
      const currentUsed = platform.usage?.creditsUsed ?? 0;
      const updatedUsage = {
        ...platform.usage,
        creditsUsed: currentUsed,
        creditsRemaining: Math.max(0, newLimit - currentUsed),
      };

      setCurrentPlatform(queryClient, {
        ...platform,
        plan: updatedPlan as any,
        usage: updatedUsage as any,
      });

      const updateData = (old: any) => {
        if (!old) return old;
        const used = old.usage?.creditsUsed ?? 0;
        return {
          ...old,
          plan: {
            ...old.plan,
            plan: targetPlanKey,
            includedCredits: newLimit,
          },
          usage: {
            ...old.usage,
            creditsUsed: used,
            creditsRemaining: Math.max(0, newLimit - used),
          },
        };
      };

      queryClient.setQueryData(PLATFORM_BILLING_SUBSCRIPTION_KEY, updateData);

      if (platform?.id) {
        queryClient.setQueryData(
          billingKeys.platformSubscription(platform.id),
          updateData,
        );
      }

      await queryClient.invalidateQueries();
      if (platform?.id) {
        await queryClient.refetchQueries({
          queryKey: ['platform', platform.id],
        });
        await queryClient.refetchQueries({
          queryKey: billingKeys.platformSubscription(platform.id),
        });
      }

      toast.success(
        t('Plan {plan} berhasil diaktifkan langsung (Mode Development).', {
          plan: res.plan.toUpperCase(),
        }),
      );

      onSelected?.();
      usePlanSwitchSuccessDialogStore.getState().openDialog(res.plan);
    },
    onError: (err) => {
      console.error('Plan switch error:', err);
      toast.error(t('Failed to switch plan. Please try again.'));
    },
  });

  const currentPlanId = (platform?.plan?.plan ?? subscription?.plan?.plan ?? 'free').toLowerCase();
  const hasScheduledChange = !isNil(subscription?.cancelAt);
  const downgradeWarning = planSelectorUtils.dropToFreeWarning(
    subscription?.additionalSeats,
  );
  const allPlans = (plans && plans.length > 0) ? plans : DEFAULT_PURCHASABLE_PLANS;
  const currentPlan = allPlans.find((plan) => plan.id === currentPlanId);
  const hasAnnualOption = allPlans.some(
    (plan) => plan.interval === planSelectorUtils.ANNUAL_INTERVAL,
  );
  const [cycleOverride, setCycleOverride] = useState<BillingCycle | null>(null);
  const billingCycle =
    cycleOverride ??
    (currentPlan?.interval === planSelectorUtils.ANNUAL_INTERVAL
      ? 'year'
      : 'month');

  const proceedCheckout = async (intent: CheckoutIntent) => {
    const rawPlan = (intent.planId || intent.planName || '').toLowerCase();
    const targetPlanKey = rawPlan.includes('enterprise')
      ? 'enterprise'
      : rawPlan.includes('team')
        ? 'team'
        : rawPlan.includes('plus')
          ? 'plus'
          : 'free';

    // Free: skip payment, switch directly
    if (targetPlanKey === 'free') {
      switchPlan(targetPlanKey);
      return;
    }

    if (targetPlanKey === 'enterprise') {
      const whatsappUrl =
        'https://wa.me/62882000221551?text=' +
        encodeURIComponent('Halo Anticeil, saya tertarik untuk beralih ke paket Enterprise.');
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    setIsMidtransLoading(true);
    try {
      const { snapToken, clientKey, orderId } = await platformBillingApi.getMidtransToken({
        plan: targetPlanKey,
        cycle: billingCycle,
      });

      try {
        localStorage.setItem(
          'anticeil_pending_order',
          JSON.stringify({ orderId, plan: targetPlanKey, timestamp: Date.now() }),
        );
      } catch (e) {
        // ignore storage error
      }

      await loadSnapScript(clientKey);

      (window as any).snap.pay(snapToken, {
        onSuccess: async () => {
          toast.success(t('Pembayaran berhasil! Plan {plan} sedang diaktifkan...', { plan: targetPlanKey.toUpperCase() }));
          try {
            await platformBillingApi.verifyMidtransPayment({ orderId });
            refreshBillingCaches(queryClient);
          } catch (e) {
            switchPlan(targetPlanKey);
          }
          try {
            localStorage.removeItem('anticeil_pending_order');
          } catch (e) {
            // ignore
          }
          navigate(`/platform/billing/success?action=upgrade&order_id=${orderId || ''}&plan=${targetPlanKey}&transaction_status=settlement`);
          onSelected?.();
        },
        onPending: () => {
          toast.info(t('Pembayaran sedang diproses / menunggu transfer. Paket akan aktif otomatis setelah Anda menyelesaikan pembayaran.'));
          // Start polling in background to detect settlement
          let pollCount = 0;
          const pollInterval = window.setInterval(async () => {
            pollCount++;
            if (pollCount > 36) { // 3 minutes timeout
              window.clearInterval(pollInterval);
              return;
            }
            try {
              const res = await platformBillingApi.verifyMidtransPayment({ orderId });
              if (res.success) {
                window.clearInterval(pollInterval);
                try {
                  localStorage.removeItem('anticeil_pending_order');
                } catch (e) {
                  // ignore
                }
                toast.success(t('Pembayaran berhasil terverifikasi! Paket {plan} telah aktif.', { plan: (res.plan || targetPlanKey).toUpperCase() }));
                refreshBillingCaches(queryClient);
                await queryClient.invalidateQueries();
                usePlanSwitchSuccessDialogStore.getState().openDialog(res.plan || targetPlanKey);
              }
            } catch (e) {
              // ignore polling error
            }
          }, 5000);
          onSelected?.();
        },
        onError: () => {
          toast.error(t('Pembayaran gagal. Silakan coba lagi.'));
          navigate('/platform/billing/error');
        },
        onClose: () => {
          toast.info(t('Jika sudah transfer via bank/e-wallet, klik tombol "Verifikasi Pembayaran" di halaman Billing untuk mengaktifkan paket.'), {
            duration: 8000,
          });
        },
      });
    } catch (err) {
      console.error('Midtrans error:', err);
      toast.error(t('Gagal memulai pembayaran. Silakan coba lagi.'));
    } finally {
      setIsMidtransLoading(false);
    }
  };

  const handleCheckout = (intent: CheckoutIntent) => {
    const targetPlan = allPlans.find((plan) => plan.id === intent.planId);
    ensureSeatFloor({
      targetSeats: targetPlan?.includedSeats ?? null,
      planName: intent.planName,
      proceed: () => proceedCheckout(intent),
    });
  };

  const isCheckoutPending = isSwitching || isMidtransLoading;

  if (isLoading && isNil(plans)) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-5 gap-0">
          <div />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 p-4 border-l border-border/60">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-0 border-t border-border/40 py-2">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-8 mx-auto" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const catalogEntries = planSelectorUtils.PLAN_CATALOG;

  return (
    <div className="flex flex-col gap-4">
      {hasAnnualOption && (
        <Tabs
          value={billingCycle}
          onValueChange={(value) => setCycleOverride(value as BillingCycle)}
          className="self-start"
        >
          <TabsList className="bg-muted/80 p-1 border border-border/60 rounded-lg">
            <TabsTrigger
              value="month"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-medium px-4"
            >
              {t('Monthly')}
            </TabsTrigger>
            <TabsTrigger
              value="year"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-medium px-4"
            >
              {t('Annually')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Mobile & Tablet View (< 1024px): Responsive Cards */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {catalogEntries.map((entry, colIdx) => {
          const apiPlan =
            entry.key === 'enterprise'
              ? undefined
              : planSelectorUtils.findPurchasablePlan({
                  plans: allPlans,
                  key: entry.key,
                  cycle: entry.key === 'free' ? 'month' : billingCycle,
                });
          const monthlySibling =
            entry.key === 'enterprise' || entry.key === 'free'
              ? undefined
              : planSelectorUtils.findPurchasablePlan({
                  plans: allPlans,
                  key: entry.key,
                  cycle: 'month',
                });
          const pricing = planSelectorUtils.computePricing({
            entry,
            apiPlan,
            monthlySibling,
          });
          const normalizedCurrentKey = currentPlanId.includes('enterprise')
            ? 'enterprise'
            : currentPlanId.includes('team')
              ? 'team'
              : currentPlanId.includes('plus')
                ? 'plus'
                : 'free';
          const isCurrent = entry.key === normalizedCurrentKey;

          // Get features for this plan from comparison rows
          const planFeatures = COMPARISON_ROWS.map((row) => {
            // Find value corresponding to this catalog entry
            const val = row.values[colIdx + (catalogEntries.length === 3 ? 1 : 0)] ?? false;
            return {
              label: row.label,
              tooltip: row.tooltip,
              value: val,
            };
          }).filter((f) => f.value !== false);

          return (
            <div
              key={entry.key}
              className={cn(
                'flex flex-col justify-between rounded-xl border bg-card p-5 transition-all shadow-xs',
                entry.highlighted
                  ? 'border-primary/50 shadow-md ring-1 ring-primary/20 bg-primary/[0.01]'
                  : 'border-border/80',
              )}
            >
              <div className="flex flex-col gap-4">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3
                      className={cn(
                        'text-lg font-bold',
                        entry.highlighted && 'text-primary',
                      )}
                    >
                      {t(entry.name)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {t(entry.blurb)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {entry.highlighted && (
                      <Badge
                        variant="default"
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      >
                        {t('Popular')}
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge
                        variant="outline"
                        className="text-[10px] px-2 py-0.5 rounded-full text-muted-foreground bg-muted/50"
                      >
                        {t('Current')}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Pricing Display */}
                <div className="flex flex-col gap-1 py-1">
                  {!isNil(pricing) ? (
                    <>
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                          {pricing.amount}
                        </span>
                        {!isNil(pricing.suffix) && (
                          <span className="text-sm font-medium text-muted-foreground">
                            {pricing.suffix}
                          </span>
                        )}
                        {!isNil(pricing.freeMonths) && (
                          <Badge
                            variant="accent"
                            className="rounded-full text-[10px] px-2 py-0.5 ml-1"
                          >
                            {t(
                              '{count, plural, =1 {1 free month} other {# free months}}',
                              { count: pricing.freeMonths },
                            )}
                          </Badge>
                        )}
                      </div>
                      {!isNil(pricing.annualNote) && (
                        <span className="text-xs text-muted-foreground">
                          {pricing.annualNote}
                        </span>
                      )}
                    </>
                  ) : entry.key === 'enterprise' ? (
                    <span className="text-lg font-bold text-muted-foreground">
                      {t('Custom pricing')}
                    </span>
                  ) : null}
                </div>

                {/* CTA Button */}
                <PlanCta
                  isFree={entry.key === 'free'}
                  isEnterprise={entry.key === 'enterprise'}
                  isCurrent={isCurrent}
                  isOnPaidPlan={
                    !isNil(currentPlanId) &&
                    currentPlanId !== planSelectorUtils.FREE_PLAN_ID
                  }
                  hasScheduledChange={hasScheduledChange}
                  highlighted={entry.highlighted}
                  apiPlan={apiPlan}
                  currentPlanId={currentPlanId}
                  isPending={isCheckoutPending}
                  checkoutPlanId={undefined}
                  onCheckout={(planId, action) =>
                    handleCheckout({
                      planId,
                      action,
                      planName: t(entry.name),
                      priceAmount: pricing?.amount ?? '',
                      features: [],
                    })
                  }
                  onSwitchPlan={switchPlan}
                  isSwitching={isSwitching}
                  onKeepPlan={() => setIsKeepPlanOpen(true)}
                  onDowngrade={() => setIsCancelOpen(true)}
                />

                {/* Features List */}
                <div className="pt-3 border-t border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2.5">
                    {t(entry.featuresHeader ?? "What's included:")}
                  </span>
                  <ul className="space-y-2">
                    {planFeatures.map((feat) => (
                      <li
                        key={feat.label}
                        className="flex items-center gap-2 text-xs sm:text-sm text-foreground/90"
                      >
                        <Check className="size-4 text-primary shrink-0" />
                        <span className="truncate">
                          {typeof feat.value === 'string'
                            ? `${formatComparisonValue(feat.value)} ${t(feat.label).toLowerCase()}`
                            : t(feat.label)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View (>= 1024px): Full Comparison Table */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full border-collapse">
          {/* Plan headers */}
          <thead>
            <tr>
              <th className="w-[28%] p-0" />
              {catalogEntries.map((entry) => {
                const apiPlan =
                  entry.key === 'enterprise'
                    ? undefined
                    : planSelectorUtils.findPurchasablePlan({
                        plans: allPlans,
                        key: entry.key,
                        cycle: entry.key === 'free' ? 'month' : billingCycle,
                      });
                const monthlySibling =
                  entry.key === 'enterprise' || entry.key === 'free'
                    ? undefined
                    : planSelectorUtils.findPurchasablePlan({
                        plans: allPlans,
                        key: entry.key,
                        cycle: 'month',
                      });
                const pricing = planSelectorUtils.computePricing({
                  entry,
                  apiPlan,
                  monthlySibling,
                });
                const normalizedCurrentKey = currentPlanId.includes('enterprise')
                  ? 'enterprise'
                  : currentPlanId.includes('team')
                    ? 'team'
                    : currentPlanId.includes('plus')
                      ? 'plus'
                      : 'free';
                const isCurrent = entry.key === normalizedCurrentKey;

                return (
                  <th
                    key={entry.key}
                    className={cn(
                      'p-0 text-left border-l border-border/60 align-top',
                      entry.highlighted && 'bg-primary/[0.03]',
                    )}
                  >
                    <div className="flex flex-col gap-3 px-4 pt-4 pb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-base font-semibold',
                            entry.highlighted && 'text-primary',
                          )}
                        >
                          {t(entry.name)}
                        </span>
                        {entry.highlighted && (
                          <Badge
                            variant="default"
                            className="text-[10px] px-1.5 py-0 rounded-sm font-medium"
                          >
                            {t('Popular')}
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 rounded-sm text-muted-foreground"
                          >
                            {t('Current')}
                          </Badge>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex flex-col gap-0.5 min-h-[3rem]">
                        {!isNil(pricing) ? (
                          <>
                            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                              <span className="text-2xl font-bold leading-tight">
                                {pricing.amount}
                              </span>
                              {!isNil(pricing.suffix) && (
                                <span className="text-xs text-muted-foreground">
                                  {pricing.suffix}
                                </span>
                              )}
                              {!isNil(pricing.freeMonths) && (
                                <Badge
                                  variant="accent"
                                  className="rounded-sm text-[10px] px-1 py-0"
                                >
                                  {t(
                                    '{count, plural, =1 {1 free month} other {# free months}}',
                                    { count: pricing.freeMonths },
                                  )}
                                </Badge>
                              )}
                            </div>
                            {!isNil(pricing.annualNote) && (
                              <span className="text-[10px] text-muted-foreground">
                                {pricing.annualNote}
                              </span>
                            )}
                          </>
                        ) : entry.key === 'enterprise' ? (
                          <span className="text-sm text-muted-foreground font-medium">
                            {t('Custom pricing')}
                          </span>
                        ) : null}
                      </div>

                      {/* CTA */}
                      <PlanCta
                        isFree={entry.key === 'free'}
                        isEnterprise={entry.key === 'enterprise'}
                        isCurrent={isCurrent}
                        isOnPaidPlan={
                          !isNil(currentPlanId) &&
                          currentPlanId !== planSelectorUtils.FREE_PLAN_ID
                        }
                        hasScheduledChange={hasScheduledChange}
                        highlighted={entry.highlighted}
                        apiPlan={apiPlan}
                        currentPlanId={currentPlanId}
                        isPending={isCheckoutPending}
                        checkoutPlanId={undefined}
                        onCheckout={(planId, action) =>
                          handleCheckout({
                            planId,
                            action,
                            planName: t(entry.name),
                            priceAmount: pricing?.amount ?? '',
                            features: [],
                          })
                        }
                        onSwitchPlan={switchPlan}
                        isSwitching={isSwitching}
                        onKeepPlan={() => setIsKeepPlanOpen(true)}
                        onDowngrade={() => setIsCancelOpen(true)}
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Feature rows */}
          <tbody>
            {COMPARISON_ROWS.map((row, rowIdx) => (
              <tr
                key={row.label}
                className={cn(
                  'border-t border-border/40',
                  rowIdx % 2 === 0 ? 'bg-transparent' : 'bg-muted/20',
                )}
              >
                {/* Feature label */}
                <td className="py-2.5 px-4 text-sm text-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <span>{t(row.label)}</span>
                    {!isNil(row.tooltip) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-3 text-muted-foreground cursor-help shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px] text-xs">
                          {t(row.tooltip)}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </td>

                {/* Value cells */}
                {catalogEntries.map((entry, colIdx) => {
                  const val = row.values[colIdx + (catalogEntries.length === 3 ? 1 : 0)];
                  return (
                    <td
                      key={colIdx}
                      className={cn(
                        'py-2.5 px-4 text-sm text-center border-l border-border/60',
                        entry?.highlighted && 'bg-primary/[0.03]',
                      )}
                    >
                      {val === true ? (
                        <Check className="size-4 mx-auto text-primary" />
                      ) : val === false ? (
                        <Minus className="size-4 mx-auto text-muted-foreground/40" />
                      ) : (
                        <span className="text-xs font-medium text-foreground/80">
                          {formatComparisonValue(val)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deactivateUsersDialog}
      {seatFloorDialog}
      <CancelSubscriptionDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        title={t('We are sorry to see you go')}
        confirmText={t('Downgrade to Free')}
        warning={downgradeWarning}
        onConfirm={cancelWithSeatCheck}
      />
      {!isNil(subscription) && (
        <KeepPlanDialog
          open={isKeepPlanOpen}
          onOpenChange={setIsKeepPlanOpen}
          info={subscription}
        />
      )}
    </div>
  );
}

function PlanCta({
  isFree,
  isEnterprise,
  isCurrent,
  isOnPaidPlan,
  hasScheduledChange,
  highlighted,
  apiPlan,
  currentPlanId,
  isPending,
  checkoutPlanId,
  onCheckout,
  onSwitchPlan,
  isSwitching,
  onKeepPlan,
  onDowngrade,
}: PlanCtaProps) {
  if (isEnterprise) {
    if (isCurrent) {
      return (
        <Button
          variant="outline"
          className="w-full border-border/80 bg-muted/40 text-muted-foreground font-medium disabled:opacity-75"
          disabled
        >
          {t('Current plan')}
        </Button>
      );
    }
    const whatsappUrl =
      'https://wa.me/62882000221551?text=' +
      encodeURIComponent('Halo Anticeil, saya tertarik untuk beralih ke paket Enterprise.');
    return (
      <Button
        asChild
        variant="default"
        className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium shadow-xs"
      >
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          {t('Switch to Enterprise (Unlock All)')}
        </a>
      </Button>
    );
  }

  if (isCurrent) {
    if (hasScheduledChange) {
      return (
        <Button variant="default" className="w-full font-medium" onClick={onKeepPlan}>
          {t('Keep current plan')}
        </Button>
      );
    }
    return (
      <Button
        variant="outline"
        className="w-full border-border/80 bg-muted/40 text-muted-foreground font-medium disabled:opacity-75"
        disabled
      >
        {t('Current plan')}
      </Button>
    );
  }

  if (isFree) {
    if (!isOnPaidPlan) {
      return (
        <Button
          variant="outline"
          className="w-full border-border/80 bg-muted/40 text-muted-foreground font-medium disabled:opacity-75"
          disabled
        >
          {t('Current plan')}
        </Button>
      );
    }
    return (
      <Button
        variant="outline"
        className="w-full border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 font-medium transition-colors"
        onClick={() => onSwitchPlan('free')}
        disabled={isSwitching}
      >
        {isSwitching ? t('Switching...') : t('Downgrade to Free')}
      </Button>
    );
  }

  if (isNil(apiPlan)) {
    return null;
  }
  const action = planSelectorUtils.actionFor({ currentPlanId });
  return (
    <Button
      variant={highlighted ? 'default' : 'secondary'}
      className={cn(
        'w-full font-medium transition-all',
        highlighted
          ? 'font-semibold shadow-xs bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-white/90'
          : 'border border-border/80 text-foreground bg-secondary/90 hover:bg-secondary hover:border-foreground/30',
      )}
      disabled={isPending || isSwitching}
      loading={apiPlan.id === checkoutPlanId}
      onClick={() => onCheckout(apiPlan.id, action)}
    >
      {t('Purchase Now')}
    </Button>
  );
}

type PlanSelectorProps = {
  enabled: boolean;
  onSelected?: () => void;
};

type PlanCtaProps = {
  isFree: boolean;
  isEnterprise: boolean;
  isCurrent: boolean;
  isOnPaidPlan: boolean;
  hasScheduledChange: boolean;
  highlighted?: boolean;
  apiPlan?: PurchasablePlan;
  currentPlanId: string | null | undefined;
  isPending: boolean;
  checkoutPlanId: string | undefined;
  onCheckout: (planId: string, action: CheckoutAction) => void;
  onSwitchPlan: (plan: string) => void;
  isSwitching: boolean;
  onKeepPlan: () => void;
  onDowngrade: () => void;
};

type CheckoutIntent = {
  planId: string;
  action: CheckoutAction;
  planName: string;
  priceAmount: string;
  features: string[];
};
