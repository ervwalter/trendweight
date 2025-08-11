import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import Dashboard from "../components/dashboard/dashboard";
import DashboardPlaceholder from "../components/dashboard/dashboard-placeholder";
import { Layout } from "../components/layout";
import { ensureProfile, ensureProviderLinks } from "../lib/loaders/utils";
import { useRealtimeProgress } from "../lib/realtime/use-realtime-progress";

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

  // Generate a unique progressId for this dashboard load
  const progressId = useMemo(() => crypto.randomUUID(), []);

  // Establish realtime subscription early, before any Suspense boundaries
  useRealtimeProgress(progressId);

  return (
    <Layout suspenseFallback={<DashboardPlaceholder sharingCode={sharingCode} progressId={progressId} />} noIndex={!isDemo}>
      <Dashboard sharingCode={sharingCode} progressId={progressId} />
    </Layout>
  );
}
