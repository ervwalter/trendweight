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
  const clerk = window.Clerk;

  if (!clerk) {
    // Clerk not yet initialized, redirect to login
    throw redirect({
      to: "/login",
      search: {
        from: location.pathname,
      },
    });
  }

  // Since we're using ClerkLoaded wrapper, clerk should already be loaded
  const user = clerk.user;

  if (!user) {
    // Redirect to login with the original destination
    throw redirect({
      to: "/login",
      search: {
        from: location.pathname,
      },
    });
  }
}
