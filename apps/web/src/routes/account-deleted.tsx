import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout";
import { AccountDeleted } from "@/components/account-deleted/account-deleted";

export const Route = createFileRoute("/account-deleted")({
  component: AccountDeletedPage,
});

function AccountDeletedPage() {
  return (
    <Layout title="Account Deleted">
      <AccountDeleted />
    </Layout>
  );
}
