import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/layout";
import { Settings } from "../components/settings/settings";
import { requireAuth } from "../lib/auth/auth-guard";
import { ensureProfile } from "../lib/loaders/utils";

export const Route = createFileRoute("/settings")({
  beforeLoad: (ctx) => requireAuth(ctx.context, ctx.location),
  loader: async ({ context }) => {
    // Ensure user has a profile
    await ensureProfile(context.auth.getToken);
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
