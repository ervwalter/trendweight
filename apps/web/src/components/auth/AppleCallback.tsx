import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/useAuth";
import { Heading } from "../ui/Heading";

export function AppleCallback() {
  const navigate = useNavigate();
  const { signInWithAppleToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the authorization response from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        // Apple can send the response in either hash or query params
        const idToken = hashParams.get("id_token") || queryParams.get("id_token");
        const state = hashParams.get("state") || queryParams.get("state");
        const error = hashParams.get("error") || queryParams.get("error");

        if (error) {
          throw new Error(`Apple authentication failed: ${error}`);
        }

        if (!idToken) {
          throw new Error("No ID token received from Apple");
        }

        // Validate state for CSRF protection
        const savedState = sessionStorage.getItem("apple_auth_state");
        if (!savedState || savedState !== state) {
          throw new Error("Invalid state parameter - possible CSRF attack");
        }

        // Sign in with Supabase using the ID token
        await signInWithAppleToken(idToken);

        // Get the redirect destination
        const redirectTo = sessionStorage.getItem("apple_auth_redirect") || "/dashboard";

        // Clean up session storage
        sessionStorage.removeItem("apple_auth_state");
        sessionStorage.removeItem("apple_auth_redirect");

        // Redirect to the intended destination
        navigate({ to: redirectTo });
      } catch (err) {
        console.error("Apple callback error:", err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred");
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [navigate, signInWithAppleToken]);

  if (isProcessing) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <Heading level={1}>Completing sign in...</Heading>
        <p className="text-gray-600">Please wait while we complete your sign in with Apple.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <Heading level={1} className="text-red-600">
        Sign In Failed
      </Heading>
      <p className="mb-6 text-gray-700">{error}</p>
      <a href="/login" className="bg-brand-600 hover:bg-brand-700 inline-block rounded px-4 py-2 text-white transition-colors">
        Back to Log In
      </a>
    </div>
  );
}
