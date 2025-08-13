import type { RouterContext } from "@/router";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
