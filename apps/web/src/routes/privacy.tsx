import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { Privacy } from "../components/privacy/Privacy";

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
