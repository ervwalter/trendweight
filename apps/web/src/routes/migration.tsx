import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/layout";
import { Migration } from "../components/migration/migration";
import { requireAuth } from "../lib/auth/auth-guard";

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
