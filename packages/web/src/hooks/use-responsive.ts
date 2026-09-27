import * as React from 'react';

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type ResponsiveState = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallScreen: boolean;
  isTouch: boolean;
  width: number;
};

export function useResponsive(): ResponsiveState {
  const [state, setState] = React.useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isSmallScreen: false,
        isTouch: false,
        width: 1200,
      };
    }
    const width = window.innerWidth;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    return {
      isMobile: width < BREAKPOINTS.md,
      isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
      isDesktop: width >= BREAKPOINTS.lg,
      isSmallScreen: width < BREAKPOINTS.lg,
      isTouch,
      width,
    };
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const width = window.innerWidth;
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      setState({
        isMobile: width < BREAKPOINTS.md,
        isTablet: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
        isDesktop: width >= BREAKPOINTS.lg,
        isSmallScreen: width < BREAKPOINTS.lg,
        isTouch,
        width,
      });
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}

/**
 * Backward-compatible helper for legacy components
 */
export function useIsMobile(): boolean {
  return useResponsive().isMobile;
}

export function useIsSmallScreen(): boolean {
  return useResponsive().isSmallScreen;
}
