import { redirect } from "@tanstack/react-router";
import { queryClient } from "../query-client";
import { queryOptions } from "../api/queries";

/**
 * Ensures the user has a profile, redirecting to initial setup if not.
 * @param sharingCode - Optional sharing code for shared dashboards
 * @throws Redirect to /initial-setup if no profile exists (authenticated users)
 * @throws Redirect to / if no profile exists (shared dashboards)
 */
export async function ensureProfile(sharingCode?: string): Promise<void> {
  if (sharingCode) {
    // Skip validation for demo
    if (sharingCode === "demo") {
      return;
    }

    // For shared dashboards, check if profile exists
    try {
      const profile = await queryClient.fetchQuery(queryOptions.profile(sharingCode));

      if (!profile) {
        throw redirect({ to: "/", replace: true });
      }
    } catch {
      // If profile not found or any error, redirect to home
      throw redirect({ to: "/", replace: true });
    }
  } else {
    // For authenticated users, check if profile exists
    const profile = await queryClient.fetchQuery(queryOptions.profile());

    if (!profile) {
      throw redirect({ to: "/initial-setup", replace: true });
    }

    // Check if this is a newly migrated profile
    if (profile.user?.isNewlyMigrated) {
      throw redirect({ to: "/migration", replace: true });
    }
  }
}

/**
 * Ensures the user has at least one non-legacy provider connected, redirecting if not.
 * @param sharingCode - Optional sharing code for shared dashboards
 * @throws Redirect to /link for authenticated users or / for shared dashboards if no non-legacy provider links exist
 */
export async function ensureProviderLinks(sharingCode?: string): Promise<void> {
  // Skip validation for demo
  if (sharingCode === "demo") {
    return;
  }

  const providerLinks = await queryClient.fetchQuery(queryOptions.providerLinks(sharingCode));

  // Check if at least one non-legacy provider exists
  const hasNonLegacyProvider = providerLinks?.some((link) => link.provider !== "legacy" && link.hasToken && !link.isDisabled) ?? false;

  if (!hasNonLegacyProvider) {
    const redirectTo = sharingCode ? "/" : "/link";
    throw redirect({ to: redirectTo, replace: true });
  }
}

/**
 * Ensures the user is newly migrated, redirecting if not.
 * Used specifically for the migration welcome page.
 * @throws Redirect to /dashboard if user is not newly migrated
 */
export async function ensureNewlyMigrated(): Promise<void> {
  const profile = await queryClient.fetchQuery(queryOptions.profile());

  // If no profile exists, redirect to initial setup
  if (!profile) {
    throw redirect({ to: "/initial-setup", replace: true });
  }

  // If user is not newly migrated, redirect to dashboard
  if (!profile.user?.isNewlyMigrated) {
    throw redirect({ to: "/dashboard", replace: true });
  }
}
