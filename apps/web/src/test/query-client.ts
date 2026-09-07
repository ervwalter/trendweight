import { QueryClient } from "@tanstack/react-query";

// A QueryClient for tests: no retries (so failures surface immediately) and no cache
// retention between tests. Create one per test so cached data cannot leak across cases.
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}
