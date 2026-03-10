import { useEffect, useState } from 'react';

const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
} as const;

export interface ViewportState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
}

function getViewportState(width: number): ViewportState {
  return {
    isMobile: width < BREAKPOINTS.mobile,
    isTablet: width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.desktop,
    width,
  };
}

function getWindowWidth(): number {
  if (typeof window === 'undefined') {
    return BREAKPOINTS.desktop;
  }

  return window.innerWidth;
}

export function useViewport(): ViewportState {
  const [state, setState] = useState<ViewportState>(() =>
    getViewportState(getWindowWidth())
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => {
        setState(getViewportState(window.innerWidth));
      };

      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? window.innerWidth;
      setState(getViewportState(width));
    });

    observer.observe(document.documentElement);
    setState(getViewportState(window.innerWidth));

    return () => observer.disconnect();
  }, []);

  return state;
}
