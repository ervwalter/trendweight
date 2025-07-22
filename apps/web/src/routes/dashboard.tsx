import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "../components/dashboard/Dashboard";
import DashboardPlaceholder from "../components/dashboard/DashboardPlaceholder";
import { Layout } from "../components/Layout";
import { requireAuth } from "../lib/auth/authGuard";
import { ensureProfile, ensureProviderLinks } from "../lib/loaders/utils";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: requireAuth,
  loader: async () => {
    // Ensure user has profile and provider links
    await ensureProfile();
    await ensureProviderLinks();
    return null;
  },
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <Layout title="Dashboard" suspenseFallback={<DashboardPlaceholder />}>
      <Dashboard />
    </Layout>
  );
}
