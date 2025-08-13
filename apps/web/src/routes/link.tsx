import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/layout";
import { Link } from "../components/link/link";
import { requireAuth } from "../lib/auth/auth-guard";
import { ensureProfile } from "../lib/loaders/utils";

export const Route = createFileRoute("/link")({
  beforeLoad: (ctx) => requireAuth(ctx.context, ctx.location),
  loader: async ({ context }) => {
    // Ensure user has completed initial setup
    await ensureProfile(context.auth.getToken);
    return null;
  },
  component: LinkPage,
  validateSearch: (search: Record<string, unknown>): { provider?: string; success?: string; error?: string } => {
    return {
      provider: search.provider as string | undefined,
      success: search.success as string | undefined,
      error: search.error as string | undefined,
    };
  },
});

function LinkPage() {
  return (
    <Layout title="Connect Your Scale">
      <Link />
    </Layout>
  );
}
