import { t } from 'i18next';
import { Goal } from 'lucide-react';

import { useBuilderStateContext } from '@/app/builder/builder-hooks';
import { cn } from '@/lib/utils';

const TriggerWidget = ({ isSelected }: { isSelected: boolean }) => {
  const canvasOrientation = useBuilderStateContext(
    (state) => state.canvasOrientation,
  );

  if (canvasOrientation === 'horizontal') {
    return (
      <div
        className={cn(
          'absolute right-full top-1/2 -translate-y-1/2 mr-2 flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground z-10 transition-all',
          {
            'border-primary text-primary': isSelected,
            'group-hover:border-ring': !isSelected,
          },
        )}
      >
        <Goal className="size-3.5"></Goal>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center absolute transition-all -translate-y-[26px] -translate-x-[1px] border border-solid justify-center gap-1.5 rounded-t-md text-xs py-1 px-2.5 z-10 font-medium',
        {
          'border-primary bg-primary/15 text-primary': isSelected,
          'border-border bg-card text-muted-foreground group-hover:border-ring':
            !isSelected,
        },
      )}
    >
      <Goal className="w-3 h-3" /> {t('Trigger')}
    </div>
  );
};

export { TriggerWidget };
