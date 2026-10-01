import { cn } from '@/lib/utils';

const LargeWidgetWrapper = ({
  children,
  containerClassName,
}: {
  children: React.ReactNode;
  containerClassName?: string;
}) => {
  return (
    <div className="absolute top-[12px] z-40 w-full px-2 sm:px-4 flex justify-center pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto py-1.5 px-3.5 border min-h-11.5 border border-border bg-background z-40 w-full max-w-2xl animate animate-fade duration-300 rounded-md flex items-center justify-between gap-2',
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
