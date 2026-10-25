/**
 * Shared layout constants for application body containers across all breakpoints
 * - Mobile & Tablet (< lg): 0 margin/padding horizontally and vertically (full-bleed edge-to-edge)
 * - Desktop (lg+): margin left 2, margin right 2, margin top 8, margin bottom 8 (lg:ml-2 lg:mr-2 lg:mt-8 lg:mb-8)
 * - Consistent border color and thickness matching border-sidebar-border (1px solid)
 */
export const LAYOUT_BODY_CONTAINER = {
  /** Outer spacing: 0 on mobile & tablet; lg: margin-left 2, margin-right 2, margin-top 8, margin-bottom 8 on desktop */
  OUTER_PADDING: 'p-0 m-0 lg:ml-2 lg:mr-2 lg:mt-8 lg:mb-8',
  /** Base classes for dashboard-content-container (consistent 1px border matching border-sidebar-border) */
  CONTENT_CONTAINER:
    'relative flex flex-col h-full flex-1 min-h-0 bg-background overflow-clip rounded-none border-0 lg:rounded-xl lg:border lg:border-sidebar-border shadow-xs',
} as const;
