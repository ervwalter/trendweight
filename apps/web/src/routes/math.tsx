import { createFileRoute } from "@tanstack/react-router";
import { Math } from "../components/math/Math";
import { Layout } from "../components/Layout";

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
