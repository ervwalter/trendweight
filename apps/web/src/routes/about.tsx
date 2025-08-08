import { createFileRoute } from "@tanstack/react-router";
import { About } from "../components/about/about";
import { Layout } from "../components/layout";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <Layout title="About">
      <About />
    </Layout>
  );
}
