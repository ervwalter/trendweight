import { createFileRoute, redirect } from "@tanstack/react-router";
import { Verify } from "../components/auth/Verify";
import { Layout } from "../components/Layout";
import { supabase } from "../lib/supabase/client";

export const Route = createFileRoute("/auth/verify")({
  // This runs BEFORE the component renders, outside of React's lifecycle
  loader: async ({ location }) => {
    // Check if already logged in
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      throw redirect({ to: "/dashboard" });
    }

    // Check if this is a Supabase magic link or OAuth callback
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get("token");
    const type = searchParams.get("type");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      return { error: errorDescription || error, needsEmail: false };
    }

    // Magic link requires token and type=email
    if (token && type === "email") {
      return { error: null, needsEmail: false, token };
    }

    // Check if this looks like an OAuth callback (has hash or specific query params)
    const hasAuthParams = location.hash || searchParams.get("code") || searchParams.get("access_token");

    if (hasAuthParams) {
      // OAuth callbacks - Supabase handles them automatically
      return { error: null, needsEmail: false, isOAuth: true };
    }

    // Manual visit with no auth parameters - redirect to home
    throw redirect({ to: "/" });
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
