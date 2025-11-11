import { useEffect, useState } from "react";

/**
 * Hook to match media queries, using Tailwind CSS breakpoints
 *
 * Tailwind breakpoints:
 * - sm: 640px
 * - md: 768px
 * - lg: 1024px
 * - xl: 1280px
 * - 2xl: 1536px
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    // Initialize with current media query state
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    // Check if window is defined (for SSR)
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);

    // Create event listener
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener
    media.addEventListener("change", listener);

    // Clean up
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

// Tailwind breakpoint helpers
export const useIsMobile = () => useMediaQuery("(max-width: 767px)"); // Below md
export const useIsTablet = () => useMediaQuery("(min-width: 768px) and (max-width: 1023px)"); // md to lg
export const useIsDesktop = () => useMediaQuery("(min-width: 1024px)"); // lg and above
