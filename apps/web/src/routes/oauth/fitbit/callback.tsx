import { createFileRoute } from "@tanstack/react-router";
import { OAuthCallback } from "@/components/providers/oauth-callback";
import { Layout } from "@/components/layout";
import { parseOAuthCallbackSearch } from "@/lib/routes/oauth-callback-search";

export const Route = createFileRoute("/oauth/fitbit/callback")({
  component: FitbitCallbackPage,
  validateSearch: parseOAuthCallbackSearch,
});

function FitbitCallbackPage() {
  const search = Route.useSearch();
  return (
    <Layout title="Fitbit Connection">
      <OAuthCallback provider="fitbit" search={search} />
    </Layout>
  );
}
