import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout";
import { Link } from "@/components/link/link";
import { requireAuth } from "@/lib/auth/auth-guard";
import { ensureProfile } from "@/lib/loaders/utils";

export const Route = createFileRoute("/link")({
  beforeLoad: (ctx) => requireAuth(ctx.context, ctx.location),
  loader: async ({ context }) => {
    // Ensure user has completed initial setup
    await ensureProfile(context.queryClient, context.auth.getToken);
    return null;
  },
  component: LinkPage,
});

function LinkPage() {
  return (
    <Layout title="Connect Your Scale">
      <Link />
    </Layout>
  );
}
