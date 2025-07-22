import { createFileRoute } from "@tanstack/react-router";
import { AppleCallback } from "../components/auth/AppleCallback";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/auth/apple/callback")({
  component: AppleCallbackPage,
});

function AppleCallbackPage() {
  return (
    <Layout title="Apple Sign In">
      <AppleCallback />
    </Layout>
  );
}
