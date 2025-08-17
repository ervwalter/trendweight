import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout";
import { TipJar } from "@/components/tipjar/tip-jar";

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
