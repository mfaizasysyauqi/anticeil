import { isNil } from '@activepieces/core-utils';
import {
  ApEdition,
  ApFlagId,
  PlanName,
  PlatformBillingInformation,
} from '@activepieces/shared';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { t } from 'i18next';
import { ArrowUpRight, BadgeCheck, ExternalLink, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { BillingPageShell } from '@/app/components/billing-page-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  CurrentSubscriptionCard,
  CreditsCard,
  CreditsInfoDialog,
  AutoRechargeCard,
  CancelSubscriptionDialog,
  KeepPlanDialog,
  planSelectorUtils,
  UsersCard,
  billingMutations,
  billingUtils,
  refreshBillingCaches,
  useCancelSubscriptionGuard,
  useManagePlanDialogStore,
} from '@/features/billing';
import { platformBillingApi } from '@/features/billing/api/billing-plans-api';
import { flagsHooks } from '@/hooks/flags-hooks';
import { platformHooks } from '@/hooks/platform-hooks';

export default function Billing() {
  return (
    <BillingPageShell
      lockTitle={t('Unlock Billing Page')}
      errorMessage={t('Failed to load billing information')}
    >
      {({ platform, info }) => (
        <BillingPageDetails platform={platform} info={info} />
      )}
    </BillingPageShell>
  );
}

function BillingPageDetails({ platform, info }: BillingPageDetailsProps) {
  const queryClient = useQueryClient();
  const { openDialog } = useManagePlanDialogStore();
  const { data: edition } = flagsHooks.useFlag<ApEdition>(ApFlagId.EDITION);
  const isCommunity = edition === ApEdition.COMMUNITY;
  const { mutate: redirectToPortalSession, isPending: isOpeningPortal } =
    billingMutations.usePortalLink();
  const [isKeepPlanOpen, setIsKeepPlanOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [verifyOrderId, setVerifyOrderId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const { cancelWithSeatCheck, deactivateUsersDialog } =
    useCancelSubscriptionGuard();
  const { mutate: refreshBilling, isPending: isRefreshing } =
    billingMutations.useRefreshSubscription();

  // Auto-check pending order from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('anticeil_pending_order');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.orderId) {
          setVerifyOrderId(parsed.orderId);
          platformBillingApi
            .verifyMidtransPayment({ orderId: parsed.orderId })
            .then((res) => {
              if (res.success) {
                try { localStorage.removeItem('anticeil_pending_order'); } catch (e) {}
                toast.success(
                  t('Pembayaran berhasil diverifikasi! Paket {plan} telah aktif.', {
                    plan: (res.plan || 'Plus').toUpperCase(),
                  }),
                );
                refreshBilling(undefined);
                refreshBillingCaches(queryClient);
              }
            })
            .catch(() => {});
        }
      }
    } catch (e) {}
  }, []);

  const handleVerify = async (idToVerify?: string) => {
    const targetId = (idToVerify || verifyOrderId).trim();
    setIsVerifying(true);
    try {
      const res = await platformBillingApi.verifyMidtransPayment(
        targetId ? { orderId: targetId } : {},
      );
      if (res.success) {
        try { localStorage.removeItem('anticeil_pending_order'); } catch (e) {}
        toast.success(res.message || t('Pembayaran berhasil diverifikasi! Paket telah aktif.'));
        setIsVerifyOpen(false);
        refreshBilling(undefined);
        refreshBillingCaches(queryClient);
        await queryClient.invalidateQueries();
      } else {
        toast.info(res.message || t('Pembayaran belum terkonfirmasi oleh Midtrans.'));
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t('Gagal memverifikasi pembayaran. Pastikan Order ID benar.'),
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const isCloud = edition === ApEdition.CLOUD;

  const isPaid = billingUtils.isPaidPlan(info.plan.plan);
  const { creditsFeature, appSumoCreditsFeature, seatsFeature } = info;
  const isAppSumoCredits =
    isNil(creditsFeature) && !isNil(appSumoCreditsFeature);
  const displayedCreditsFeature = creditsFeature ?? appSumoCreditsFeature;
  const appSumoAiCreditsTotal =
    (info.usage.appSumoAiCreditsUsed ?? 0) +
    (info.usage.appSumoAiCreditsRemaining ?? 0);
  const autoRechargeNote = isAppSumoCredits
    ? t('Auto recharge your AI credits — {remaining} of {total} left.', {
        remaining: (info.usage.appSumoAiCreditsRemaining ?? 0).toLocaleString(),
        total: appSumoAiCreditsTotal.toLocaleString(),
      })
    : undefined;
  const hasBillingPortal = info.billingPortalAvailable;
  const isComped = isPaid && isNil(info.trialEndsAt) && !hasBillingPortal;
  const isCompedLifetimePlan =
    info.plan.plan === PlanName.APPSUMO ||
    info.plan.plan === PlanName.FREE_LEGACY;
  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-medium">{t('Billing & subscription')}</h1>
          <div className="text-sm text-muted-foreground">
            {t(
              'For questions about billing contact us at anticeil.official@gmail.com',
            )}
          </div>
        </div>
        {!isCommunity && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/10"
              onClick={() => setIsVerifyOpen(true)}
            >
              <BadgeCheck className="size-4 mr-2 text-teal-600 dark:text-teal-400" />
              {t('Verifikasi Pembayaran')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              loading={isRefreshing}
              onClick={() =>
                refreshBilling(undefined, {
                  onSuccess: () =>
                    toast.success(t('Billing information refreshed')),
                })
              }
            >
              <RefreshCw className="size-4 mr-2" />
              {t('Refresh')}
            </Button>
          </div>
        )}
      </div>
      <Separator />
      {!isPaid && (
        <Alert className="border-teal-500/30 bg-teal-500/5 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="size-5 text-teal-600 dark:text-teal-400 shrink-0" />
            <div>
              <div className="font-medium text-sm">
                {t('Sudah bayar via Midtrans tapi status masih Free?')}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('Klik tombol di samping untuk sinkronisasi otomatis status pembayaran Anda dengan Midtrans.')}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setIsVerifyOpen(true)}
          >
            <BadgeCheck className="size-4 mr-2" />
            {t('Verifikasi Sekarang')}
          </Button>
        </Alert>
      )}
      {info.billingUnavailable && (
        <Alert variant="warning">
          <AlertDescription>
            {t(
              'Our billing service is temporarily unavailable, so plan and credit details may be out of date. Your flows keep running — we are working on a fix.',
            )}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-6">
        {!isCommunity && (
          <BillingSection
            title={t('Current subscription')}
            description={
              <div className="flex flex-col gap-2">
                <span>
                  {t('Your current plan is {plan}.', {
                    plan: info.autumnPlanName ?? t('Free'),
                  })}{' '}
                  {t(
                    'Upgrade anytime to get more credits and unlock features.',
                  )}
                </span>
                <LinkButton onClick={openDialog}>
                  {t('Explore plans')}
                </LinkButton>
              </div>
            }
          >
            <CurrentSubscriptionCard info={info} onExplorePlans={openDialog} />
            <SubscriptionScheduleNotice info={info} />
          </BillingSection>
        )}

        {!isCommunity && <Separator />}

        {!isCommunity && (
          <BillingSection
            title={t('Credits')}
            description={
              <div className="flex flex-col gap-2">
                <span>
                  {t(
                    'Credits are what you spend to run flows, AI steps, and chat. See how they add up and how to get more.',
                  )}
                </span>
                <CreditsInfoDialog />
              </div>
            }
          >
            <CreditsCard info={info} />
            {isPaid &&
              isNil(info.trialEndsAt) &&
              !isNil(displayedCreditsFeature) && (
                <AutoRechargeCard
                  feature={displayedCreditsFeature}
                  hasCard={hasBillingPortal}
                  note={autoRechargeNote}
                />
              )}
          </BillingSection>
        )}

        {!isCommunity && !isNil(seatsFeature) && (
          <>
            <Separator />
            <BillingSection
              title={t('Seats')}
              description={t(
                'Manage how many members can join your platform. New seats are available immediately.',
              )}
            >
              <UsersCard info={info} feature={seatsFeature} />
            </BillingSection>
          </>
        )}

        {isPaid && !isComped && (
          <>
            <Separator />
            <BillingSection
              title={t('Manage subscription')}
              description={t(
                'Update your payment method, review your past invoices, cancel your subscription.',
              )}
            >
              <div className="flex flex-col items-center gap-3">
                {hasBillingPortal && (
                  <Button
                    variant="outline"
                    className="w-full"
                    loading={isOpeningPortal}
                    onClick={() => redirectToPortalSession()}
                  >
                    {t('Manage subscription in Stripe')}
                    <ExternalLink className="size-3.5 ml-2" />
                  </Button>
                )}
                {!isCompedLifetimePlan &&
                  (isNil(info.cancelAt) ? (
                    <Button
                      variant="link"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setIsCancelOpen(true)}
                    >
                      {t('Cancel subscription')}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="w-full"
                      onClick={() => setIsKeepPlanOpen(true)}
                    >
                      {t('Keep current plan')}
                    </Button>
                  ))}
              </div>
            </BillingSection>
          </>
        )}


        <Separator />
        <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{t('Secure Payment:')}</span>
            <span>{t('Processed by official Midtrans Payment Gateway (IDR)')}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/docs/legal/terms" target="_blank" className="hover:text-foreground underline">
              {t('Terms of Service')}
            </Link>
            <Link to="/docs/legal/privacy" target="_blank" className="hover:text-foreground underline">
              {t('Privacy Policy')}
            </Link>
            <Link to="/docs" target="_blank" className="hover:text-foreground underline">
              {t('Documentation')}
            </Link>
          </div>
        </div>
      </div>
      {deactivateUsersDialog}
      <CancelSubscriptionDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        title={t('We are sorry to see you go')}
        confirmText={t('Cancel subscription')}
        warning={planSelectorUtils.dropToFreeWarning(info.additionalSeats)}
        onConfirm={cancelWithSeatCheck}
      />
      <KeepPlanDialog
        open={isKeepPlanOpen}
        onOpenChange={setIsKeepPlanOpen}
        info={info}
      />
      <Dialog open={isVerifyOpen} onOpenChange={setIsVerifyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="size-5 text-teal-600" />
              {t('Verifikasi Pembayaran Midtrans')}
            </DialogTitle>
            <DialogDescription>
              {t('Sinkronisasi transaksi Midtrans Anda untuk mengaktifkan paket secara instan.')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="text-sm font-medium">{t('Nomor Order ID')}</div>
            <Input
              placeholder="AC-xxx / anticeil-xxx (opsional jika otomatis)"
              value={verifyOrderId}
              onChange={(e) => setVerifyOrderId(e.target.value)}
            />
            <div className="text-xs text-muted-foreground leading-relaxed">
              {t('Order ID dapat ditemukan pada struk transfer, QRIS, atau email konfirmasi Midtrans Anda. Kosongkan untuk memeriksa pesanan terakhir secara otomatis.')}
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="ghost"
              onClick={() => setIsVerifyOpen(false)}
              disabled={isVerifying}
            >
              {t('Batal')}
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              loading={isVerifying}
              onClick={() => handleVerify()}
            >
              <BadgeCheck className="size-4 mr-2" />
              {t('Cek & Aktifkan Paket')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


const BillingSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_400px] md:gap-20 pr-4">
    <div className="flex flex-col gap-1">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
    <div className="flex flex-col gap-3">{children}</div>
  </section>
);

const SubscriptionScheduleNotice = ({
  info,
}: {
  info: PlatformBillingInformation;
}) => {
  if (isNil(info.cancelAt)) {
    return null;
  }
  const date = dayjsCancelDate(info.cancelAt);
  return (
    <span className="text-sm text-muted-foreground">
      {!isNil(info.scheduledPlanName)
        ? t('Switches to {plan} on {date}', {
            plan: info.scheduledPlanName,
            date,
          })
        : t('Subscription will end on {date}', { date })}
    </span>
  );
};

function dayjsCancelDate(cancelAt: string): string {
  return dayjs(cancelAt).format('MMM D, YYYY');
}

const LinkButton = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
  >
    {children}
    <ArrowUpRight className="size-3.5" />
  </button>
);

type BillingPageDetailsProps = {
  platform: ReturnType<typeof platformHooks.useCurrentPlatform>['platform'];
  info: PlatformBillingInformation;
};
