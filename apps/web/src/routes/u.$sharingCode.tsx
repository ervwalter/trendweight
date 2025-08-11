import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "../components/dashboard/dashboard";
import DashboardPlaceholder from "../components/dashboard/dashboard-placeholder";
import { SyncProgressProvider } from "../components/dashboard/sync-progress";
import { Layout } from "../components/layout";
import { ensureProfile, ensureProviderLinks } from "../lib/loaders/utils";

export const Route = createFileRoute("/u/$sharingCode")({
  loader: async ({ params }) => {
    const { sharingCode } = params;

    // Skip validation for demo
    if (sharingCode === "demo") {
      return null;
    }

    // Only validate profile and provider links in the loader
    await ensureProfile(sharingCode);
    await ensureProviderLinks(sharingCode);

    return null;
  },
  component: SharedDashboard,
});

function SharedDashboard() {
  const { sharingCode } = Route.useParams();
  const isDemo = sharingCode === "demo";

  return (
    <SyncProgressProvider>
      <Layout suspenseFallback={<DashboardPlaceholder />} noIndex={!isDemo}>
        <Dashboard sharingCode={sharingCode} />
      </Layout>
    </SyncProgressProvider>
  );
}
