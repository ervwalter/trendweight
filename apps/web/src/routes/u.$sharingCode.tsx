import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "../components/dashboard/Dashboard";
import DashboardPlaceholder from "../components/dashboard/DashboardPlaceholder";
import { Layout } from "../components/Layout";
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
  return (
    <Layout suspenseFallback={<DashboardPlaceholder />}>
      <Dashboard sharingCode={sharingCode} />
    </Layout>
  );
}
