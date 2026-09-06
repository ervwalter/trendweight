import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { createQueryClient } from "@/lib/query-client";

interface AuthCacheBoundaryProps {
  identity: string | null;
  children: (queryClient: QueryClient) => ReactNode;
}

function AccountQueryProvider({ children }: Pick<AuthCacheBoundaryProps, "children">) {
  const [queryClient] = useState(createQueryClient);
  useEffect(() => () => queryClient.clear(), [queryClient]);
  return <QueryClientProvider client={queryClient}>{children(queryClient)}</QueryClientProvider>;
}

// A new account gets a separate cache and component tree. Late requests and
// mutation callbacks can only write into the old account's discarded client.
export function AuthCacheBoundary({ identity, children }: AuthCacheBoundaryProps) {
  return <AccountQueryProvider key={identity ?? "signed-out"}>{children}</AccountQueryProvider>;
}
