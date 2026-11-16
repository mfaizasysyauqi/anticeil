import React from 'react';
import { cn } from '@/lib/utils';

export interface AnticeilLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export const ANTICEIL_LOGO_PATH =
  'M 258.0 116.6 L 376.0 1.0 L 376.0 46.0 L 281.0 140.0 L 309.0 169.0 L 309.0 347.5 L 514.5 147.0 L 514.5 191.0 L 309.0 394.0 L 309.0 438.0 L 514.5 233.0 L 514.5 280.0 L 327.4 467.0 L 514.5 654.0 L 514.5 701.0 L 310.0 498.0 L 310.0 718.0 L 274.0 753.0 L 274.0 180.0 L 258.0 163.1 L 242.0 180.0 L 242.0 753.0 L 206.0 718.0 L 206.0 498.0 L 1.5 701.0 L 1.5 654.0 L 188.6 467.0 L 1.5 280.0 L 1.5 233.0 L 207.0 438.0 L 207.0 394.0 L 1.5 191.0 L 1.5 147.0 L 207.0 347.5 L 207.0 169.0 L 235.0 140.0 L 140.0 46.0 L 140.0 1.0 Z';

export function AnticeilLogo({ className, size, ...props }: AnticeilLogoProps) {
  return (
    <svg
      viewBox="0 0 516 756"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      style={size ? { width: size, height: size } : undefined}
      className={cn('shrink-0 text-foreground transition-colors duration-150 select-none pointer-events-none', className)}
      aria-label="Anticeil Logo"
      {...props}
    >
      <path d={ANTICEIL_LOGO_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export default AnticeilLogo;
