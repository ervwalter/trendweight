import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { Settings } from "../components/settings/Settings";
import { requireAuth } from "../lib/auth/authGuard";
import { ensureProfile } from "../lib/loaders/utils";

export const Route = createFileRoute("/settings")({
  beforeLoad: requireAuth,
  loader: async () => {
    // Ensure user has a profile
    await ensureProfile();
    return null;
  },
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <Layout title="Settings">
      <Settings />
    </Layout>
  );
}
