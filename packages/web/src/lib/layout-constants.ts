/**
 * Shared layout constants for application body containers across all breakpoints
 * - Mobile & Tablet (< lg): 0 margin/padding horizontally and vertically (full-bleed edge-to-edge)
 * - Desktop (lg+): 8px vertical margin, 2px horizontal margin
 * - Consistent border color and thickness matching border-sidebar-border (1px solid)
 */
export const LAYOUT_BODY_CONTAINER = {
  /** Outer spacing: 0 on mobile & tablet; lg: mx-2 (2px horizontal) + my-8 (8px vertical) on desktop */
  OUTER_PADDING: 'p-0 lg:mx-2 lg:my-8',
  /** Base classes for dashboard-content-container (consistent 1px border matching border-sidebar-border) */
  CONTENT_CONTAINER:
    'relative flex flex-col h-full flex-1 min-h-0 bg-background overflow-clip rounded-none border-0 lg:rounded-tl-xl lg:border-t lg:border-l lg:border-sidebar-border shadow-xs',
} as const;
