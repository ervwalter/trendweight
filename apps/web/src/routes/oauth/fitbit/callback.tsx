import { createFileRoute } from "@tanstack/react-router";
import { FitbitCallback } from "../../../components/providers/FitbitCallback";
import { Layout } from "../../../components/Layout";

export const Route = createFileRoute("/oauth/fitbit/callback")({
  component: FitbitCallbackPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      code: search.code ? String(search.code) : undefined,
      state: search.state ? String(search.state) : undefined,
    };
  },
});

function FitbitCallbackPage() {
  return (
    <Layout title="Fitbit Connection">
      <FitbitCallback />
    </Layout>
  );
}
