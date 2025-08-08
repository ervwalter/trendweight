import { createFileRoute } from "@tanstack/react-router";
import { Login } from "../components/auth/login";
import { Layout } from "../components/layout";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    console.log("[login] beforeLoad called");
  },
  component: LoginPage,
});

function LoginPage() {
  console.log("[login] LoginPage component rendering");
  return (
    <Layout title="Log In">
      <Login />
    </Layout>
  );
}
