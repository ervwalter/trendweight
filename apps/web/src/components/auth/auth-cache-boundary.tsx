import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createQueryClient } from "@/lib/query-client";

interface AuthCacheBoundaryProps {
  identity: string | null;
  children: (queryClient: QueryClient) => ReactNode;
}

function AccountQueryProvider({ children }: Pick<AuthCacheBoundaryProps, "children">) {
  const [queryClient] = useState(createQueryClient);
  const mountGeneration = useRef(0);
  useEffect(() => {
    // StrictMode runs this cleanup and then the effect again on the same client during
    // the initial mount. Clearing synchronously there cancels route loaders that are
    // already fetching (they reject with CancelledError), so defer the clear and skip
    // it when the effect has re-run in the meantime.
    mountGeneration.current += 1;
    const generation = mountGeneration.current;
    return () => {
      queueMicrotask(() => {
        if (mountGeneration.current === generation) {
          queryClient.clear();
        }
      });
    };
  }, [queryClient]);
  return <QueryClientProvider client={queryClient}>{children(queryClient)}</QueryClientProvider>;
}

// A new account gets a separate cache and component tree. Late requests and
// mutation callbacks can only write into the old account's discarded client.
export function AuthCacheBoundary({ identity, children }: AuthCacheBoundaryProps) {
  return <AccountQueryProvider key={identity ?? "signed-out"}>{children}</AccountQueryProvider>;
}
