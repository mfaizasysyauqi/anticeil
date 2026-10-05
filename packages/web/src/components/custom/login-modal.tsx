import { t } from 'i18next';

import { FullLogo } from '@/components/custom/full-logo';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ThirdPartyLogin } from '@/features/authentication/components/third-party-logins';

type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Single unified DRY login modal used across the entire application (action gates & /sign-in).
 */
export const LoginModal = ({ open, onOpenChange }: LoginModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="sm:max-w-[425px] p-6 sm:p-7 gap-5 rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
      >
        {/* Header with Logo, Title, Subtitle */}
        <div className="flex flex-col items-center text-center gap-2 pt-1">
          <FullLogo className="h-8 mb-1" />
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {t('Welcome to Anticeil')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-normal max-w-[280px]">
            {t(
              'Automate anything. Bring your own API key from Plus plan and above.',
            )}
          </DialogDescription>
        </div>


        {/* OAuth Form */}
        <ThirdPartyLogin
          isSignUp={false}
          onSamlClick={() => {}}
          hideSaml={true}
        />

        {/* Guest Footer */}
        <div className="pt-2 text-center border-t border-border/60">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:underline cursor-pointer"
          >
            {t('Or explore templates as Guest (Read-Only) →')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


