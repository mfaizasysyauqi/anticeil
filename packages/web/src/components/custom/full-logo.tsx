import { t } from 'i18next';

import { flagsHooks } from '@/hooks/flags-hooks';
import { cn } from '@/lib/utils';

const FullLogo = ({ className }: { className?: string }) => {
  const branding = flagsHooks.useWebsiteBranding();

  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <img
        className="h-8 w-auto max-h-[36px] object-contain shrink-0"
        src={branding?.logos?.fullLogoUrl || '/logo.png'}
        alt={branding?.websiteName || 'Anticeil'}
      />
      <span className="font-bold text-[18px] tracking-tight text-foreground font-sans">
        {branding?.websiteName || 'Anticeil'}
      </span>
    </div>
  );
};
FullLogo.displayName = 'FullLogo';
export { FullLogo };

