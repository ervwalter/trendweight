import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { Link } from "../components/link/Link";
import { requireAuth } from "../lib/auth/authGuard";
import { ensureProfile } from "../lib/loaders/utils";

export const Route = createFileRoute("/link")({
  beforeLoad: requireAuth,
  loader: async () => {
    // Ensure user has completed initial setup
    await ensureProfile();
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
