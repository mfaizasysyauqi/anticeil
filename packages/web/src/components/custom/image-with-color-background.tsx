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
  const isKnownDarkIcon =
    typeof src === 'string' &&
    (src.includes('new-core/empty-trigger') ||
      src.includes('new-core/loop') ||
      src.includes('new-core/router') ||
      src.includes('new-core/code.svg') ||
      src.includes('pieces/github.') ||
      src.includes('pieces/openai.') ||
      src.includes('pieces/chatgpt.') ||
      src.includes('pieces/perplexity.') ||
      src.includes('pieces/typeform.') ||
      src.includes('pieces/notion.') ||
      src.includes('pieces/linear.') ||
      src.includes('pieces/threads.') ||
      src.includes('pieces/vercel.'));

  const [isDarkIcon, setIsDarkIcon] = useState<boolean>(() => isKnownDarkIcon);
  // Drop crossOrigin on error so logos on CORS-less hosts still render (without the tint).
  const [useCrossOrigin, setUseCrossOrigin] = useState(true);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setIsLoading(false);
      if (isKnownDarkIcon) {
        setIsDarkIcon(true);
        setBackgroundColor(null);
        return;
      }
      const img = e.currentTarget;
      colorsUtils.fac
        .getColorAsync(img, { algorithm: 'simple' })
        .then((color) => {
          const [r, g, b] = color.value;
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          const maxDiff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
          // STRICT monochrome check: only pure grayscale/black icons (maxDiff < 12 && luminance < 0.25)
          // Any colored icon (Groq orange, VS Code blue, Slack, Playwright, etc.) will have maxDiff > 30 and MUST NEVER be inverted.
          const isMonochromeBlack = maxDiff < 12 && luminance < 0.25;
          
          if (isMonochromeBlack) {
            setIsDarkIcon(true);
            setBackgroundColor(null);
          } else {
            setIsDarkIcon(false);
            setBackgroundColor(
              `color-mix(in srgb, rgb(${r},${g},${b}) 15%, var(--card) 85%)`,
            );
          }
        })
        .catch(() => {
          setBackgroundColor(null);
        });
    },
    [isKnownDarkIcon],
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
