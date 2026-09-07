import { redirect } from "@tanstack/react-router";
import type { ParsedLocation } from "@tanstack/router-core";
import type { RouterContext } from "@/router";

/**
 * Simple auth guard that checks if user is logged in and redirects to login if not.
 * The page the user was trying to reach is carried along in `from` so the login
 * route can send them back there afterwards.
 *
 * Usage:
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: (ctx) => requireAuth(ctx.context, ctx.location),
 *   component: DashboardPage,
 * })
 */
export function requireAuth(context: Pick<RouterContext, "auth">, location: ParsedLocation) {
  if (!context.auth.isLoggedIn) {
    throw redirect({
      to: "/login",
      search: {
        from: safeRedirectPath(location.href),
      },
    });
  }
}

/**
 * Narrows a `from` search value to a same-origin path that is safe to hand to the
 * auth provider as a post-login redirect. Anything that could leave the site
 * (`//evil.example`, `/\evil.example`, `https://...`) or that is not a string is dropped.
 *
 * The prefix rules alone are not enough: the WHATWG URL parser strips ASCII tab and
 * newline before parsing and treats `\` like `/`, so `/\t/evil.example` resolves to
 * another origin. The value is therefore also resolved against the current origin
 * and the normalized path, search and hash of that resolution are returned.
 */
export function safeRedirectPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/")) return undefined;
  if (value.startsWith("//") || value.startsWith("/\\")) return undefined;

  let resolved: URL;
  try {
    resolved = new URL(value, window.location.origin);
  } catch {
    return undefined;
  }
  if (resolved.origin !== window.location.origin) return undefined;

  const path = resolved.pathname + resolved.search + resolved.hash;
  if (path === "/login" || path.startsWith("/login?") || path.startsWith("/login#")) return undefined;
  return path;
}
