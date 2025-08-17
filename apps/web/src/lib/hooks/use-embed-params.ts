import { useSearch } from "@tanstack/react-router";

interface EmbedParams {
  embed?: boolean;
  dark?: boolean;
  width?: number;
}

/**
 * Hook to get embed-specific parameters from the current route with proper types.
 * Uses validated search params from the sharing route when available, falls back to empty for other routes.
 * This hook is designed to be reusable for any route that supports embed parameters.
 *
 * Currently only works with the sharing route, but can be extended to support other routes
 * that implement embed functionality in the future.
 */
export function useEmbedParams(): EmbedParams {
  const search = useSearch({
    from: "/u/$sharingCode",
    shouldThrow: false, // returns undefined if not under the sharing route
  });

  // Return only embed-related params or empty object if not on sharing route
  return {
    embed: search?.embed,
    dark: search?.dark,
    width: search?.width,
  };
}
