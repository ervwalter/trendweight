import { useSearch } from "@tanstack/react-router";
import type { Mode, TimeRange } from "../core/interfaces";

interface SharingSearchParams {
  range?: TimeRange;
  mode?: Mode;
}

/**
 * Hook to get sharing-specific search parameters from the current route with proper types.
 * Uses validated search params from the sharing route when available, falls back to empty for other routes.
 * For embed-related parameters (embed, dark, width), use useEmbedParams instead.
 */
export function useSharingSearchParams(): SharingSearchParams {
  const search = useSearch({
    from: "/u/$sharingCode",
    shouldThrow: false, // returns undefined if not under the sharing route
  });

  // Return only sharing-related params or empty object if not on sharing route
  return {
    range: search?.range,
    mode: search?.mode,
  };
}
