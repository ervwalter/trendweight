import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { Migration } from "../components/migration/Migration";
import { requireAuth } from "../lib/auth/authGuard";

export const Route = createFileRoute("/migration")({
  beforeLoad: requireAuth,
  component: MigrationPage,
});

function MigrationPage() {
  return (
    <Layout title="Welcome Back">
      <Migration />
    </Layout>
  );
}
