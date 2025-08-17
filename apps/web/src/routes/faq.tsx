import { createFileRoute } from "@tanstack/react-router";
import { Faq } from "@/components/faq/faq";
import { Layout } from "@/components/layout";

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
