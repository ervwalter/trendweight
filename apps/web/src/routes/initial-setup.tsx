import { createFileRoute, redirect } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { InitialSetup } from "../components/initial-setup/InitialSetup";
import { requireAuth } from "../lib/auth/authGuard";
import { queryOptions } from "../lib/api/queries";
import { queryClient } from "../lib/queryClient";

export const Route = createFileRoute("/initial-setup")({
  beforeLoad: requireAuth,
  loader: async () => {
    // Check if user already has a profile
    const profile = await queryClient.fetchQuery(queryOptions.profile());

    if (profile) {
      // User already has a profile, redirect to settings
      throw redirect({ to: "/settings", replace: true });
    }

    return null;
  },
  component: InitialSetupPage,
});

function InitialSetupPage() {
  return (
    <Layout title="Initial Setup">
      <InitialSetup />
    </Layout>
  );
}
