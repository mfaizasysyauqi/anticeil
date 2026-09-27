import { ReactNode } from 'react';

import { useEmbedding } from '@/components/providers/embed-provider';
import { cn } from '@/lib/utils';

export const PageHeader = ({
  title,
  description,
  leftContent,
  rightContent,
  className = '',
}: PageHeaderProps) => {
  const { embedState } = useEmbedding();

  if (embedState.hidePageHeader) {
    return null;
  }

  return (
    <div
      className={cn(
        'sticky top-0 z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 px-4 w-full bg-background border-b border-border/40',
        className,
      )}
    >
      <div className="flex items-center gap-2 grow min-w-0">
        <div className="grow min-w-0">
          {typeof title === 'string' ? (
            <h1 className="text-base font-semibold truncate">{title}</h1>
          ) : (
            title
          )}
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{description}</p>
          )}
        </div>
        {leftContent}
      </div>
      {rightContent && (
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {rightContent}
        </div>
      )}
    </div>
  );
};

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  className?: string;
}
