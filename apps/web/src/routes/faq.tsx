import { createFileRoute } from "@tanstack/react-router";
import { Faq } from "../components/faq/Faq";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/faq")({
  component: FAQPage,
});

function FAQPage() {
  return (
    <Layout title="FAQ">
      <Faq />
    </Layout>
  );
}
