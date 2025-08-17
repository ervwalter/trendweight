import { redirect } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/router-core";
import type { RouterContext } from "@/router";

/**
 * Simple auth guard that checks if user is logged in and redirects to login if not.
 *
 * Usage:
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: (ctx) => requireAuth(ctx.context, ctx.location),
 *   component: DashboardPage,
 * })
 */
export function requireAuth(context: RouterContext, location: ParsedLocation) {
  if (!context.auth.isLoggedIn) {
    throw redirect({
      to: "/login",
      search: {
        from: location.pathname,
      },
    });
  }
}
