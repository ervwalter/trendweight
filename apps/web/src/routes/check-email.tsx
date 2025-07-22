import { createFileRoute } from "@tanstack/react-router";
import { CheckEmail } from "../components/check-email/CheckEmail";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/check-email")({
  component: CheckEmailPage,
});

function CheckEmailPage() {
  return (
    <Layout title="Check Email">
      <CheckEmail />
    </Layout>
  );
}
