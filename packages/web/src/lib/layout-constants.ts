/**
 * Shared layout constants for application body containers across all breakpoints
 * (mobile, tablet, desktop) to ensure reusable, consistent layout spacing.
 */
export const LAYOUT_BODY_CONTAINER = {
  /** Outer spacing: exactly 8px top (pt-2 = 0.5rem = 8px) and 4px left (pl-1 = 0.25rem = 4px), 0 right and bottom */
  OUTER_PADDING: 'pt-2 pl-1 pr-0 pb-0',
  /** Base classes for dashboard-content-container with clean rounded top-left corner and subtle border */
  CONTENT_CONTAINER:
    'relative flex flex-col h-full flex-1 min-h-0 bg-background overflow-clip rounded-tl-xl border-t border-l border-border/40 shadow-xs',
} as const;
