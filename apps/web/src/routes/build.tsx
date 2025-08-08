import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/layout";
import { Build } from "../components/build/build";

export const Route = createFileRoute("/build")({
  component: BuildDetailsPage,
});

function BuildDetailsPage() {
  return (
    <Layout title="Build Information">
      <Build />
    </Layout>
  );
}
