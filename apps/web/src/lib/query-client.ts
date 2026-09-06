import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";

const MAX_RETRIES = 3;

// Retrying only helps for transient failures. A 4xx (401/403/404/400...) will come back the
// same way every time, and re-trying with backoff just delays the error surfacing (and blocks
// loader navigation) for several seconds. 429 is the one client error worth waiting out.
export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429) {
    return false;
  }
  return failureCount < MAX_RETRIES;
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time of 5 minutes
        staleTime: 5 * 60 * 1000,
        retry: shouldRetry,
        // Refetch on window focus
        refetchOnWindowFocus: true,
      },
    },
  });
