import { createFileRoute } from "@tanstack/react-router";
import { Math } from "@/components/math/math";
import { Layout } from "@/components/layout";

export const Route = createFileRoute("/math")({
  component: MathPage,
});

function MathPage() {
  return (
    <Layout title="The Math Behind TrendWeight">
      <Math />
    </Layout>
  );
}
