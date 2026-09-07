import { createFileRoute } from "@tanstack/react-router";
import { OAuthCallback } from "@/components/providers/oauth-callback";
import { Layout } from "@/components/layout";
import { parseOAuthCallbackSearch } from "@/lib/routes/oauth-callback-search";

export const Route = createFileRoute("/oauth/withings/callback")({
  component: WithingsCallbackPage,
  validateSearch: parseOAuthCallbackSearch,
});

function WithingsCallbackPage() {
  const search = Route.useSearch();
  return (
    <Layout title="Withings Connection">
      <OAuthCallback provider="withings" search={search} />
    </Layout>
  );
}
