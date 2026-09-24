import React, { useState, useCallback } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { colorsUtils } from '@/lib/color-utils';
import { cn } from '@/lib/utils';

interface ImageWithColorBackgroundProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  border?: boolean;
  roundedCorner?: boolean;
}
const ImageWithColorBackground = ({
  src,
  alt,
  fallback,
  roundedCorner,
  ...props
}: ImageWithColorBackgroundProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [isDarkIcon, setIsDarkIcon] = useState<boolean>(() => {
    if (typeof src === 'string') {
      return (
        src.includes('new-core') ||
        src.includes('empty-trigger') ||
        src.includes('loop.svg') ||
        src.includes('router.svg') ||
        src.includes('code.svg')
      );
    }
    return false;
  });
  // Drop crossOrigin on error so logos on CORS-less hosts still render (without the tint).
  const [useCrossOrigin, setUseCrossOrigin] = useState(true);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoading(false);
      const img = e.currentTarget;
      colorsUtils.fac
        .getColorAsync(img, { algorithm: 'simple' })
        .then((color) => {
          const [r, g, b] = color.value;
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const diff = max - min;
          const isColored = diff > 24;
          const isPureDarkMonochrome = !isColored && max < 110;
          
          if (isPureDarkMonochrome) {
            setIsDarkIcon(true);
            setBackgroundColor(null);
          } else {
            setIsDarkIcon(false);
            if (isColored) {
              setBackgroundColor(
                `color-mix(in srgb, rgb(${r},${g},${b}) 15%, var(--card) 85%)`,
              );
            } else {
              setBackgroundColor(null);
            }
          }
        })
        .catch(() => {
          setBackgroundColor(null);
        });
    },
    [],
  );

  const handleError = useCallback(() => {
    if (useCrossOrigin) {
      setUseCrossOrigin(false);
      return;
    }
    setHasError(true);
    setIsLoading(false);
  }, [useCrossOrigin]);

  const { className, border, ...rest } = props;

  return (
    <span
      className={cn('relative inline-block h-full w-full', className, {
        'bg-muted border border-border': (backgroundColor === null || isDarkIcon) && border,
        'rounded-lg': roundedCorner,
      })}
      style={
        backgroundColor && !isDarkIcon
          ? {
              backgroundColor: backgroundColor,
              border: '1px solid var(--border)',
            }
          : {}
      }
    >
      {isLoading && !hasError && (
        <span className="absolute inset-0 flex items-center justify-center">
          {fallback ?? <Skeleton className="w-full h-full" />}
        </span>
      )}
      {!hasError && src ? (
        <img
          src={src}
          alt={alt}
          crossOrigin={useCrossOrigin ? 'anonymous' : undefined}
          key={useCrossOrigin ? 'cors' : 'no-cors'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'transition-opacity duration-500 w-full h-full object-contain',
            {
              'opacity-0': isLoading,
              'opacity-100': !isLoading,
              'dark:invert dark:brightness-125 dark:contrast-125': isDarkIcon,
            },
          )}
          {...rest}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center">
          {fallback ?? <Skeleton className="w-full h-full" />}
        </span>
      )}
    </span>
  );
};

export { ImageWithColorBackground };
