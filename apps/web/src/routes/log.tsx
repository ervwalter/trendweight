import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout";
import { LogWeight } from "@/components/log/log";
import { requireAuth } from "@/lib/auth/auth-guard";
import { ensureProfile } from "@/lib/loaders/utils";

// Note: no ensureProviderLinks here - manual entry must work with zero connected providers
export const Route = createFileRoute("/log")({
  beforeLoad: (ctx) => requireAuth(ctx.context, ctx.location),
  loader: async ({ context }) => {
    // Ensure user has a profile
    await ensureProfile(context.auth.getToken);
    return null;
  },
  component: LogPage,
});

function LogPage() {
  return (
    <Layout title="Your Weight Log">
      <LogWeight />
    </Layout>
  );
}
