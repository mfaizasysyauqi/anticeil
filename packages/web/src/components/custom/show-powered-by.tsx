import { AnticeilIcon } from '@/components/icons/anticeil-icon';
import { flagsHooks } from '@/hooks/flags-hooks';
import { cn } from '@/lib/utils';

type ShowPoweredByProps = {
  show: boolean;
  position?: 'sticky' | 'absolute' | 'static';
};

const ShowPoweredBy = ({ show, position = 'sticky' }: ShowPoweredByProps) => {
  const branding = flagsHooks.useWebsiteBranding();

  if (!show) {
    return null;
  }

  return (
    <div
      data-powered-by-branding="true"
      className={cn('bottom-0 right-3 pointer-events-none z-40', position, {
        '-mt-[30px]': position === 'sticky',
        'mr-5': position === 'sticky',
      })}
    >
      <div
        className={cn(
          'justify-end text-muted-foreground/70 text-sm items-center flex gap-1.5 transition group',
          {
            'justify-center': position === 'static',
          },
        )}
      >
        <span className="text-sm transition">Built with</span>
        <div className="flex items-center gap-1.5">
          <AnticeilIcon className="size-3.5 shrink-0" />
          <span className="font-semibold">{branding.websiteName}</span>
        </div>
      </div>
    </div>
  );
};

ShowPoweredBy.displayName = 'ShowPoweredBy';
export { ShowPoweredBy };
