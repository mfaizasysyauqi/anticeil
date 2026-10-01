import { cn } from '@/lib/utils';

const LargeWidgetWrapper = ({
  children,
  containerClassName,
}: {
  children: React.ReactNode;
  containerClassName?: string;
}) => {
  return (
    <div className="absolute top-2 sm:top-3 z-40 w-full px-2 sm:px-4 flex justify-center pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto py-1.5 px-3 border min-h-10 border-border bg-background/95 backdrop-blur-sm z-40 w-auto max-w-[calc(100%-1rem)] sm:max-w-xl animate animate-fade duration-300 rounded-lg flex items-center justify-between gap-2 shadow-sm text-xs sm:text-sm',
          containerClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
};
LargeWidgetWrapper.displayName = 'LargeWidgetWrapper';
export default LargeWidgetWrapper;
