import { t } from 'i18next';
import { cn } from '@/lib/utils';

export type ColorTone = 'primary' | 'danger' | 'warning' | 'success';

type ColorPreviewProps = {
  tone: ColorTone;
  color?: string;
};

type StepDotProps = {
  color: string;
  title: string;
};

function hexToRgb(hex: string) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function mixColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  weight: number,
) {
  return `rgb(${Math.round(c1.r * (1 - weight) + c2.r * weight)}, ${Math.round(
    c1.g * (1 - weight) + c2.g * weight,
  )}, ${Math.round(c1.b * (1 - weight) + c2.b * weight)})`;
}

const DEFAULT_TONE_COLORS: Record<ColorTone, string> = {
  primary: '#0d9488',
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
};

export function getColorSteps(colorHex?: string, tone?: ColorTone): string[] {
  const fallback = tone ? DEFAULT_TONE_COLORS[tone] : '#0d9488';
  const safeHex =
    colorHex && /^#[0-9A-Fa-f]{3,8}$/.test(colorHex) ? colorHex : fallback;
  const rgb = hexToRgb(safeHex);
  const black = { r: 18, g: 18, b: 24 };
  const white = { r: 255, g: 255, b: 255 };

  return [
    mixColor(rgb, black, 0.65),
    mixColor(rgb, black, 0.35),
    safeHex,
    mixColor(rgb, white, 0.35),
    mixColor(rgb, white, 0.65),
  ];
}

export const ColorPreview = ({ tone, color }: ColorPreviewProps) => {
  const steps = getColorSteps(color, tone);
  const activeColor = steps[2];

  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 border border-border/40 px-3 py-2.5 select-none"
    >
      <span
        style={{ backgroundColor: activeColor }}
        className="rounded-md px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs"
      >
        {t('Button')}
      </span>
      <div className="flex items-center gap-1.5">
        <StepDot color={steps[0]} title={t('Surface')} />
        <StepDot color={steps[1]} title={t('Border')} />
        <StepDot color={steps[2]} title={t('Solid')} />
        <StepDot color={steps[3]} title={t('Hover')} />
        <StepDot color={steps[4]} title={t('Text and marks')} />
      </div>
    </div>
  );
};

const StepDot = ({ color, title }: StepDotProps) => (
  <span
    title={title}
    style={{ backgroundColor: color }}
    className="size-3.5 rounded-full border border-black/20 shadow-xs transition-colors"
  />
);
