import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { NotFound } from "./components/not-found";
import { RouterErrorFallback } from "./components/router-error-fallback";
import type { useAuth } from "./lib/auth/use-auth";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
  queryClient: QueryClient;
  auth: ReturnType<typeof useAuth>;
}

export const createAppRouter = () =>
  createRouter({
    routeTree,
    defaultNotFoundComponent: NotFound,
    defaultErrorComponent: RouterErrorFallback,
    defaultPreload: "intent",
    scrollRestoration: true,
    context: {} as RouterContext,
  });

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
