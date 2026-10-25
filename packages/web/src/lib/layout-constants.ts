/**
 * Shared layout constants for application body containers across all breakpoints
 * - Mobile & Tablet (< lg): 0 margin/padding horizontally and vertically (full-bleed edge-to-edge)
 * - Desktop (lg+): 8px top margin, 2px left margin
 * - Consistent border color and thickness matching border-sidebar-border (1px solid)
 */
export const LAYOUT_BODY_CONTAINER = {
  /** Outer spacing: 0 margin/padding on mobile & tablet, 8px top (lg:pt-2) and 2px left (lg:pl-[2px]) on desktop */
  OUTER_PADDING: 'p-0 lg:pt-2 lg:pl-[2px] lg:pr-0 lg:pb-0',
  /** Base classes for dashboard-content-container (consistent 1px border matching border-sidebar-border) */
  CONTENT_CONTAINER:
    'relative flex flex-col h-full flex-1 min-h-0 bg-background overflow-clip rounded-none border-0 lg:rounded-tl-xl lg:border-t lg:border-l lg:border-sidebar-border shadow-xs',
} as const;
