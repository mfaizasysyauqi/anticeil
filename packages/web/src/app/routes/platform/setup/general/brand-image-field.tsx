import { t } from 'i18next';
import { ImageUp, Lock, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const BrandImageField = ({
  id,
  label,
  hint,
  wide,
  currentUrl,
  file,
  maxSizeMb,
  disabled,
  onFileChange,
}: BrandImageFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrl = useObjectUrl(file);
  const shownUrl = previewUrl ?? (currentUrl || null);
  const hintId = `${id}-hint`;
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  const accept = (candidate: File | undefined) => {
    if (disabled || !candidate) return;
    if (!candidate.type.startsWith('image/')) {
      setError(t('Choose an image file (PNG, JPG, SVG, WebP or ICO).'));
      return;
    }
    if (candidate.size > maxSizeMb * 1024 * 1024) {
      setError(t('This file is larger than {size} MB.', { size: maxSizeMb }));
      return;
    }
    setError(null);
    onFileChange(candidate);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId} className="text-sm font-medium text-foreground">
          {label}
        </span>
        {file && (
          <span className="truncate text-xs text-muted-foreground">
            {file.name} · {formatSize(file.size)}
          </span>
        )}
      </div>
      <div
        data-dragging={dragging || undefined}
        className={cn(
          'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-xl border border-dashed border-border/60 bg-card/40 p-4 transition-colors sm:grid-cols-[auto_minmax(0,1fr)_auto]',
          'data-dragging:border-primary data-dragging:bg-primary/5',
          disabled && 'opacity-70 cursor-not-allowed',
        )}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          accept(event.dataTransfer.files?.[0]);
        }}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-muted/20 p-2 shadow-xs',
            wide ? 'w-40' : 'w-14',
          )}
        >
          {shownUrl ? (
            <img
              src={shownUrl}
              alt={label}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <ImageUp className="size-5 text-muted-foreground" />
          )}
        </div>
        <div id={hintId} className="flex min-w-0 flex-col gap-1">
          <span className="text-sm text-muted-foreground">{hint}</span>
          <span className="text-xs text-muted-foreground/75">
            {t(
              'PNG, JPG, SVG, WebP or ICO up to {size} MB. You can also drop a file here.',
              {
                size: maxSizeMb,
              },
            )}
          </span>
          {error && (
            <span id={errorId} className="text-xs text-destructive">
              {error}
            </span>
          )}
        </div>
        <div className="col-span-2 flex shrink-0 items-center gap-2 sm:col-span-1">
          {file && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setError(null);
                onFileChange(null);
              }}
            >
              <RotateCcw className="size-3.5" />
              {t('Undo')}
            </Button>
          )}
          <Button
            id={id}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-labelledby={`${id} ${labelId}`}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            onClick={() => {
              if (disabled) return;
              inputRef.current?.click();
            }}
            className={cn(
              'border-border/70 hover:bg-muted/50 cursor-pointer',
              disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
            )}
          >
            {disabled ? (
              <Lock className="size-3.5 text-muted-foreground mr-1" />
            ) : (
              <ImageUp className="size-3.5 mr-1" />
            )}
            {shownUrl ? t('Replace') : t('Upload')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            disabled={disabled}
            onChange={(event) => {
              accept(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      </div>
    </div>
  );
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

export type BrandImageFieldProps = {
  id: string;
  label: string;
  hint: string;
  wide?: boolean;
  currentUrl: string | null;
  file: File | null;
  maxSizeMb: number;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
};
