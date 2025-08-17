import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout";
import { Privacy } from "@/components/privacy/privacy";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <Layout title="Privacy">
      <Privacy />
    </Layout>
  );
}
