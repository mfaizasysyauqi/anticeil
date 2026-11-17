import { t } from 'i18next';

import { flagsHooks } from '@/hooks/flags-hooks';
import { cn } from '@/lib/utils';

const FullLogo = ({ className }: { className?: string }) => {
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <img
        className="h-8 w-8 object-contain shrink-0 rounded-md"
        src="/logo.png"
        alt="Anticeil"
      />
      <span className="font-bold text-[20px] tracking-tight text-foreground font-sans">
        Anticeil
      </span>
    </div>
  );
};
FullLogo.displayName = 'FullLogo';
export { FullLogo };

