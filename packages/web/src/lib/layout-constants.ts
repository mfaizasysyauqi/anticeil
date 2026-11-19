/**
 * Shared layout constants for application body containers across all breakpoints
 * - Mobile & Tablet (< lg): 0 margin/padding horizontally and vertically (full-bleed edge-to-edge)
 * - Desktop (lg+): margin 1 on all sides (lg:m-1 = 4px margin top, right, bottom, left)
 * - Consistent border color and thickness matching border-sidebar-border (1px solid)
 */
export const LAYOUT_BODY_CONTAINER = {
  /** Outer spacing: 0 on mobile & tablet; lg: margin 1 on all 4 sides (lg:m-1) on desktop */
  OUTER_PADDING: 'p-0 m-0 lg:m-1',
  /** Base classes for dashboard-content-container (consistent 1px border matching border-sidebar-border) */
  CONTENT_CONTAINER:
    'relative flex flex-col h-full flex-1 min-h-0 bg-background overflow-clip rounded-none border-0 lg:rounded-xl lg:border lg:border-sidebar-border shadow-xs',
} as const;

/**
 * Global horizontal padding for channel views (Text Channel, Voice Channel, Forum Channel, and Sidebar Header)
 * Used across app bar, body/feed, and bottom bar/input dock to ensure perfect horizontal symmetry and consistency.
 */
export const CHANNEL_HORIZONTAL_PADDING = 'px-4';
