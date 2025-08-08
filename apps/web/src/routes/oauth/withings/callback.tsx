import { createFileRoute } from "@tanstack/react-router";
import { WithingsCallback } from "../../../components/providers/withings-callback";
import { Layout } from "../../../components/layout";

export const Route = createFileRoute("/oauth/withings/callback")({
  component: WithingsCallbackPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: search.code ? String(search.code) : undefined,
      state: search.state ? String(search.state) : undefined,
    };
  },
});

function WithingsCallbackPage() {
  return (
    <Layout title="Withings Connection">
      <WithingsCallback />
    </Layout>
  );
}
