import { createFileRoute } from "@tanstack/react-router";
import { About } from "../components/about/About";
import { Layout } from "../components/Layout";

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
