import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";
import { AccountDeleted } from "../components/account-deleted/AccountDeleted";

export const Route = createFileRoute("/account-deleted")({
  beforeLoad: () => {
    console.log("[account-deleted] beforeLoad called");
  },
  component: AccountDeletedPage,
});

function AccountDeletedPage() {
  console.log("[account-deleted] AccountDeletedPage component rendering");
  return (
    <Layout title="Account Deleted">
      <AccountDeleted />
    </Layout>
  );
}
