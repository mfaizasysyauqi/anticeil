import { t } from 'i18next';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useManagePlanDialogStore } from '../stores/manage-plan-dialog-state';


import { authenticationSession } from '@/lib/authentication-session';

import { PlanSelector } from './plan-selector';
import { PlanSwitchSuccessDialog } from './plan-switch-success-dialog';

export function ManagePlanDialog() {
  const { isOpen, closeDialog } = useManagePlanDialogStore();
  const token = authenticationSession.getToken();

  if (!token) {
    return null;
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-[95vw] max-w-[1140px] max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader className="pb-2 pr-8 text-left items-start">
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-left">{t('Explore plans')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('Select or upgrade your subscription plan')}
            </DialogDescription>
          </DialogHeader>
          <PlanSelector enabled={isOpen} onSelected={closeDialog} />
        </DialogContent>
      </Dialog>

      <PlanSwitchSuccessDialog />
    </>
  );
}
