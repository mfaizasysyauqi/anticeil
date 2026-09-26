import { t } from 'i18next';
import { Check, CreditCard, Loader2, QrCode, Building2, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { platformHooks } from '@/hooks/platform-hooks';
import { create } from 'zustand';

type MidtransCheckoutState = {
  isOpen: boolean;
  planId: string | null;
  planName: string;
  priceAmount: string;
  billingCycle: string;
  openCheckout: (data: {
    planId: string;
    planName: string;
    priceAmount: string;
    billingCycle: string;
  }) => void;
  closeCheckout: () => void;
};

export const useMidtransCheckoutStore = create<MidtransCheckoutState>((set) => ({
  isOpen: false,
  planId: null,
  planName: '',
  priceAmount: '',
  billingCycle: 'month',
  openCheckout: (data) => set({ isOpen: true, ...data }),
  closeCheckout: () => set({ isOpen: false, planId: null }),
}));

export function MidtransCheckoutDialog() {
  const { isOpen, planId, planName, priceAmount, billingCycle, closeCheckout } =
    useMidtransCheckoutStore();
  const { platform, setCurrentPlatform } = platformHooks.useCurrentPlatform();
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va' | 'card'>('qris');
  const [isProcessing, setIsProcessing] = useState(false);

  const isTeam = planId?.includes('team') || planName.toLowerCase().includes('team');

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      // Simulate network request to Midtrans Sandbox
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update local platform state
      const updatedPlan = {
        ...platform.plan,
        plan: isTeam ? 'team' : 'plus',
        agentsEnabled: true,
        aiProvidersEnabled: true,
        mcpsEnabled: true,
        billedTeamProjectsLimit: isTeam ? null : 1,
        includedCredits: isTeam ? 50000 : 10000,
        analyticsEnabled: true,
        ssoEnabled: isTeam,
        customRolesEnabled: isTeam,
        projectRolesEnabled: isTeam,
        globalConnectionsEnabled: isTeam,
      };

      setCurrentPlatform({
        ...platform,
        plan: updatedPlan as any,
      });

      toast.success(
        t('Pembayaran Berhasil! Plan {plan} Anda sekarang telah aktif.', {
          plan: planName,
        }),
      );

      closeCheckout();
    } catch (error) {
      toast.error(t('Gagal memproses pembayaran Midtrans'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeCheckout()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span>Anticeil Payment</span>
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                Midtrans Sandbox
              </Badge>
            </DialogTitle>
          </div>
          <DialogDescription>
            {t('Pilih metode pembayaran untuk berlangganan {plan}', { plan: planName })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Order Summary */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
            <div>
              <p className="font-semibold text-foreground">{planName} Plan</p>
              <p className="text-xs text-muted-foreground">
                {billingCycle === 'year' ? 'Ditagih tahunan' : 'Ditagih bulanan'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary">{priceAmount}</span>
              <span className="text-xs text-muted-foreground">/{billingCycle === 'year' ? 'thn' : 'bln'}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <Tabs
            value={paymentMethod}
            onValueChange={(val) => setPaymentMethod(val as any)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="qris" className="flex items-center gap-1.5 text-xs">
                <QrCode className="size-3.5" />
                <span>QRIS</span>
              </TabsTrigger>
              <TabsTrigger value="va" className="flex items-center gap-1.5 text-xs">
                <Building2 className="size-3.5" />
                <span>Virtual Account</span>
              </TabsTrigger>
              <TabsTrigger value="card" className="flex items-center gap-1.5 text-xs">
                <CreditCard className="size-3.5" />
                <span>Kartu Kredit</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qris" className="pt-3">
              <div className="flex flex-col items-center justify-center p-4 border rounded-xl bg-card gap-3">
                <div className="size-40 bg-white p-2 rounded-lg border shadow-sm flex items-center justify-center">
                  <div className="w-full h-full border-2 border-dashed border-zinc-300 rounded flex flex-col items-center justify-center text-center p-2">
                    <QrCode className="size-16 text-zinc-700" />
                    <span className="text-[10px] text-zinc-500 font-mono mt-1">NMID: ID1020030040</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <span>GoPay</span> • <span>OVO</span> • <span>ShopeePay</span> • <span>BCA QR</span> • <span>Dana</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="va" className="pt-3">
              <div className="flex flex-col gap-2 p-3 border rounded-xl bg-card">
                <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <span className="font-semibold text-xs">BCA Virtual Account</span>
                  <span className="font-mono text-xs text-primary font-bold">88012984920391</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <span className="font-semibold text-xs">Mandiri Bill Payment</span>
                  <span className="font-mono text-xs text-primary font-bold">70012039481920</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded border bg-muted/20">
                  <span className="font-semibold text-xs">BRI Virtual Account</span>
                  <span className="font-mono text-xs text-primary font-bold">02938471928374</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="card" className="pt-3">
              <div className="flex flex-col gap-2 p-3 border rounded-xl bg-card">
                <div className="text-xs text-muted-foreground">
                  Nomor Kartu Uji Coba Sandbox:
                </div>
                <div className="p-2 rounded border bg-muted/20 font-mono text-xs font-semibold">
                  4811 1111 1111 1114 (CVV: 123, Exp: 12/28)
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Semua transaksi di sandbox bersifat simulasi aman dan tidak mendebit rekening asli.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Didukung oleh Midtrans Payment Sandbox Gateway</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => closeCheckout()}
            disabled={isProcessing}
          >
            {t('Batal')}
          </Button>
          <Button
            type="button"
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="gap-2"
          >
            {isProcessing && <Loader2 className="size-4 animate-spin" />}
            {isProcessing ? t('Memproses Midtrans...') : t('Bayar Sekarang ({amount})', { amount: priceAmount })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
