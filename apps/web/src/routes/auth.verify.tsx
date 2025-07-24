import { createFileRoute } from "@tanstack/react-router";
import { Verify } from "../components/auth/Verify";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/auth/verify")({
  loader: async ({ location }) => {
    // Only check for explicit errors in the URL
    const searchParams = new URLSearchParams(location.search);
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Return both error code and description if present
    return {
      errorCode: error,
      errorDescription: errorDescription,
    };
  },
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  return (
    <Layout title="Verify Email">
      <Verify />
    </Layout>
  );
}
