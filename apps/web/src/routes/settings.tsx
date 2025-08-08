import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/layout";
import { Settings } from "../components/settings/settings";
import { requireAuth } from "../lib/auth/auth-guard";
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
