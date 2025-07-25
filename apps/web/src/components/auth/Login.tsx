import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { HiOutlineMail } from "react-icons/hi";
import { Route } from "../../routes/login";
import { useAuth } from "../../lib/auth/useAuth";
import { Heading } from "../ui/Heading";
import { Button } from "../ui/Button";
import { SocialLoginButtons } from "./SocialLoginButtons";
import { OtpLogin } from "./OtpLogin";
import { AuthDivider } from "./AuthDivider";
import { AuthError } from "./AuthError";
import { PrivacyPolicyLink } from "./PrivacyPolicyLink";
import { useAppleSignIn } from "../../lib/auth/useAppleSignIn";
import { NewVersionNotice } from "../notices/NewVersionNotice";

export function Login() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { from?: string };
  const from = search.from;
  const { signInWithGoogle, signInWithMicrosoft, signInWithApple } = useAuth();
  const [error, setError] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  const handleSocialLogin = async (provider: "google" | "microsoft" | "apple") => {
    setError("");

    try {
      // For Apple in redirect mode, store the intended destination
      if (provider === "apple" && from) {
        sessionStorage.setItem("apple_auth_redirect", from);
      }

      switch (provider) {
        case "google":
          await signInWithGoogle();
          break;
        case "microsoft":
          await signInWithMicrosoft();
          break;
        case "apple":
          await signInWithApple();
          break;
      }
      // For Google/Microsoft, redirect happens here. For Apple, page will redirect to Apple
      if (provider !== "apple") {
        navigate({ to: from || "/dashboard" });
      }
    } catch (err) {
      console.error(`Error signing in with ${provider}:`, err);
      setError(`Failed to sign in with ${provider}. Please try again.`);
    }
  };

  // Load Apple Sign In JS
  useAppleSignIn();

  return (
    <div className="mx-auto max-w-md py-12">
      <NewVersionNotice />

      {error && <AuthError error={error} />}

      {!showEmailForm ? (
        <>
          <Heading level={1} className="text-center" display>
            Welcome
          </Heading>
          <p className="mb-8 text-center text-gray-600">Log in to your account or create a new one</p>

          <SocialLoginButtons onSocialLogin={handleSocialLogin} />
          <AuthDivider />
          <Button onClick={() => setShowEmailForm(true)} variant="secondary" size="lg" className="w-full justify-start gap-4">
            <HiOutlineMail className="h-5 w-5" />
            <span className="flex-1 text-left">Continue with Email</span>
          </Button>
        </>
      ) : (
        <OtpLogin
          from={from}
          onBack={() => {
            setShowEmailForm(false);
            setError("");
          }}
        />
      )}

      <PrivacyPolicyLink />
    </div>
  );
}
