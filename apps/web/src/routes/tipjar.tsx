import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { TipJar } from "../components/tipjar/TipJar";

export const Route = createFileRoute("/tipjar")({
  component: TipJarPage,
});

function TipJarPage() {
  return (
    <Layout title="Tip Jar">
      <TipJar />
    </Layout>
  );
}
