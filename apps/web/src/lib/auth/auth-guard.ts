import { redirect } from "@tanstack/react-router";

interface BeforeLoadContext {
  location: {
    pathname: string;
    href: string;
    search: Record<string, unknown>;
  };
}

declare global {
  interface Window {
    Clerk?: {
      user: {
        id: string;
        primaryEmailAddress?: {
          emailAddress: string;
        } | null;
      } | null;
      loaded: boolean;
    };
  }
}

/**
 * TanStack Router beforeLoad guard for protected routes.
 * Checks authentication state and redirects to login if not authenticated.
 *
 * Usage:
 * export const Route = createFileRoute('/dashboard')({
 *   beforeLoad: requireAuth,
 *   component: DashboardPage,
 * })
 */
export async function requireAuth({ location }: BeforeLoadContext) {
  console.log("[authGuard] requireAuth called for:", location.pathname);
  const clerk = window.Clerk;

  if (!clerk) {
    // Clerk not yet initialized, redirect to login
    console.log("[authGuard] Clerk not initialized, redirecting to login");
    throw redirect({
      to: "/login",
      search: {
        from: location.pathname,
      },
    });
  }

  // Since we're using ClerkLoaded wrapper, clerk should already be loaded
  const user = clerk.user;
  console.log("[authGuard] Clerk user:", user ? `${user.id} (${user.primaryEmailAddress?.emailAddress})` : "null");

  if (!user) {
    // Redirect to login with the original destination
    console.log("[authGuard] No user, redirecting to login with from:", location.pathname);
    throw redirect({
      to: "/login",
      search: {
        from: location.pathname,
      },
    });
  }

  console.log("[authGuard] Auth check passed for:", location.pathname);
}
