import { createFileRoute } from "@tanstack/react-router";
import { Login } from "@/components/auth/login";
import { Layout } from "@/components/layout";
import { safeRedirectPath } from "@/lib/auth/auth-guard";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { from?: string } => ({
    from: safeRedirectPath(search.from),
  }),
  component: LoginPage,
});

function LoginPage() {
  const { from } = Route.useSearch();
  return (
    <Layout title="Log In">
      <Login redirectTo={from} />
    </Layout>
  );
}
