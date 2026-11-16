import { t } from 'i18next';

import { cn } from '@/lib/utils';
import { AnticeilLogo } from './anticeil-logo';

const FullLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <AnticeilLogo className="h-7 w-7 text-foreground" />
      <span className="font-bold text-[20px] tracking-tight text-foreground font-sans">
        Anticeil
      </span>
    </div>
  );
};
FullLogo.displayName = 'FullLogo';
export { FullLogo };

