import { createRouter } from "@tanstack/react-router";
import { NotFound } from "./components/not-found";
import { RouterErrorFallback } from "./components/router-error-fallback";
import type { useAuth } from "./lib/auth/use-auth";
import { routeTree } from "./routeTree.gen";

export interface RouterContext {
  auth: ReturnType<typeof useAuth>;
}

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: RouterErrorFallback,
  defaultPreload: "intent",
  scrollRestoration: true,
  context: {} as RouterContext,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
