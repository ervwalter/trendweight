import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { Build } from "../components/build/Build";

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
