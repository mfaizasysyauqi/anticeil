import { t } from 'i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useManagePlanDialogStore } from '../stores/manage-plan-dialog-state';


import { MidtransCheckoutDialog } from './midtrans-checkout-dialog';
import { PlanSelector } from './plan-selector';
import { PlanSwitchSuccessDialog } from './plan-switch-success-dialog';

export function ManagePlanDialog() {
  const { isOpen, closeDialog } = useManagePlanDialogStore();

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[95vw] max-w-[1100px] max-h-[92svh] overflow-y-auto p-3 sm:p-5 rounded-2xl">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl sm:text-2xl font-semibold">{t('Explore plans')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('Select or upgrade your subscription plan')}
            </DialogDescription>
          </DialogHeader>
          <PlanSelector enabled={isOpen} onSelected={closeDialog} />
        </DialogContent>
      </Dialog>

      <PlanSwitchSuccessDialog />
      <MidtransCheckoutDialog />
    </>
  );
}
