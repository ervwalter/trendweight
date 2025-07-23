import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { NotFound } from "./components/NotFound";
import { RouterErrorFallback } from "./components/RouterErrorFallback";

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
  defaultErrorComponent: RouterErrorFallback,
  defaultPreload: "intent",
  // Enable scroll restoration including hash navigation
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
