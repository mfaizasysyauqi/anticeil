import React, { useState, useCallback } from 'react';

import { colorsUtils } from '@/lib/color-utils';
import { cn } from '@/lib/utils';

const KNOWN_MONOCHROME_ICONS = [
  'opencode',
  'openai',
  'chatgpt',
  'codex',
  'mcp-with-background',
  'github',
];

export function ClientIcon({
  icon,
  className = 'size-8',
}: {
  icon: string;
  className?: string;
}) {
  const [isDarkIcon, setIsDarkIcon] = useState<boolean>(() => {
    if (typeof icon === 'string') {
      const lower = icon.toLowerCase();
      return KNOWN_MONOCHROME_ICONS.some((name) => lower.includes(name));
    }
    return false;
  });

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      colorsUtils.fac
        .getColorAsync(img, { algorithm: 'simple' })
        .then((color) => {
          const [r, g, b] = color.value;
          const maxDiff = Math.max(
            Math.abs(r - g),
            Math.abs(r - b),
            Math.abs(g - b),
          );
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          // Only true grayscale/black icons should be inverted.
          // Colored icons (VS Code blue, Claude, Gemini, etc.) must NEVER be inverted.
          const isMonochromeBlack = maxDiff < 15 && luminance < 0.25;
          if (isMonochromeBlack) {
            setIsDarkIcon(true);
          } else {
            setIsDarkIcon(false);
          }
        })
        .catch(() => {});
    },
    [],
  );

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background',
        className,
      )}
    >
      <img
        src={icon}
        alt=""
        crossOrigin="anonymous"
        onLoad={handleLoad}
        className={cn('size-[62%] transition-all', {
          'dark:invert dark:brightness-125 dark:contrast-125': isDarkIcon,
        })}
      />
    </span>
  );
}
