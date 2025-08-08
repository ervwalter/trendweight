import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "../components/dashboard/dashboard";
import DashboardPlaceholder from "../components/dashboard/dashboard-placeholder";
import { Layout } from "../components/layout";
import { requireAuth } from "../lib/auth/auth-guard";
import { ensureProfile, ensureProviderLinks } from "../lib/loaders/utils";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async (context) => {
    console.log("[dashboard] beforeLoad called");
    await requireAuth(context);
  },
  loader: async () => {
    console.log("[dashboard] loader called - ensuring profile and provider links");
    // Ensure user has profile and provider links
    await ensureProfile();
    await ensureProviderLinks();
    console.log("[dashboard] loader completed");
    return null;
  },
  component: DashboardPage,
});

function DashboardPage() {
  console.log("[dashboard] DashboardPage component rendering");
  return (
    <Layout title="Dashboard" suspenseFallback={<DashboardPlaceholder />}>
      <Dashboard />
    </Layout>
  );
}
