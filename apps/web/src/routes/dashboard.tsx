import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "../components/dashboard/dashboard";
import DashboardPlaceholder from "../components/dashboard/dashboard-placeholder";
import { SyncProgressProvider } from "../components/dashboard/sync-progress";
import { Layout } from "../components/layout";
import { requireAuth } from "../lib/auth/auth-guard";
import { ensureProfile, ensureProviderLinks } from "../lib/loaders/utils";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: (ctx) => requireAuth(ctx.context, ctx.location),
  loader: async ({ context }) => {
    // Ensure user has profile and provider links
    await ensureProfile(context.auth.getToken);
    await ensureProviderLinks(context.auth.getToken);
    return null;
  },
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <SyncProgressProvider>
      <Layout title="Dashboard" suspenseFallback={<DashboardPlaceholder />}>
        <Dashboard />
      </Layout>
    </SyncProgressProvider>
  );
}
