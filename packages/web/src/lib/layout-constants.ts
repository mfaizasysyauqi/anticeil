/**
 * Shared layout constants for application body containers across all breakpoints
 * (mobile, tablet, desktop) to ensure 0 vertical/horizontal margin & consistent full-bleed layouts.
 */
export const LAYOUT_BODY_CONTAINER = {
  /** Outer padding wrapping dashboard-content-container (0px horizontally and vertically across all breakpoints) */
  OUTER_PADDING: 'p-0 m-0',
  /** Base classes for the inner dashboard-content-container (edge-to-edge, seamless, no extra border or margin) */
  CONTENT_CONTAINER:
    'relative flex flex-col h-full flex-1 min-h-0 bg-background overflow-clip rounded-none border-0 shadow-none',
} as const;
