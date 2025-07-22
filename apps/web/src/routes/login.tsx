import { createFileRoute } from "@tanstack/react-router";
import { Login } from "../components/auth/Login";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <Layout title="Log In">
      <Login />
    </Layout>
  );
}
