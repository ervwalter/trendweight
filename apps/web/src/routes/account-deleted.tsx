import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { AccountDeleted } from "../components/account-deleted/AccountDeleted";

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
