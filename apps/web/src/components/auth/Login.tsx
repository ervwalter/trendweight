import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { HiOutlineMail } from "react-icons/hi";
import { Route } from "../../routes/login";
import { useAuth } from "../../lib/auth/useAuth";
import { Heading } from "../ui/Heading";
import { Button } from "../ui/Button";
import { SocialLoginButtons } from "./SocialLoginButtons";
import { EmailLoginForm } from "./EmailLoginForm";
import { AuthDivider } from "./AuthDivider";
import { AuthError } from "./AuthError";
import { PrivacyPolicyLink } from "./PrivacyPolicyLink";
import { useAppleSignIn } from "../../lib/auth/useAppleSignIn";
import { NewVersionNotice } from "../notices/NewVersionNotice";

export function Login() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { from?: string };
  const from = search.from;
  const { sendLoginEmail, signInWithGoogle, signInWithMicrosoft, signInWithApple } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Check if captcha is required and not completed
    const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (turnstileSiteKey && !captchaToken) {
      setError("Please complete the security check.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await sendLoginEmail(email, captchaToken);
      navigate({ to: "/check-email", search: { email } });
    } catch (err) {
      console.error("Error sending login email:", err);
      setError("Failed to send login email. Please try again.");
      setIsSubmitting(false);
      // Reset captcha on error
      setCaptchaToken(undefined);
    }
  };

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

  // Force focus to email input when showing email form
  useEffect(() => {
    if (showEmailForm && emailInputRef.current) {
      // Small delay to ensure DOM is ready and overcome Turnstile focus stealing
      const timer = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showEmailForm]);

  // Load Apple Sign In JS
  useAppleSignIn();

  return (
    <div className="mx-auto max-w-md py-12">
      <NewVersionNotice />
      <Heading level={1} className="text-center" display>
        Welcome
      </Heading>
      <p className="mb-8 text-center text-gray-600">Log in to your account or create a new one</p>

      {error && <AuthError error={error} />}

      {!showEmailForm ? (
        <>
          <SocialLoginButtons onSocialLogin={handleSocialLogin} />
          <AuthDivider />
          <Button onClick={() => setShowEmailForm(true)} variant="secondary" size="lg" className="w-full justify-start gap-4">
            <HiOutlineMail className="h-5 w-5" />
            <span className="flex-1 text-left">Continue with Email</span>
          </Button>
        </>
      ) : (
        <>
          <Button
            onClick={() => {
              setShowEmailForm(false);
              setEmail("");
              setCaptchaToken(undefined);
              setError("");
            }}
            variant="ghost"
            size="sm"
            className="mb-6 -ml-2"
          >
            ← Back to login options
          </Button>

          <EmailLoginForm
            ref={emailInputRef}
            email={email}
            onEmailChange={setEmail}
            onSubmit={handleEmailSubmit}
            isSubmitting={isSubmitting}
            onCaptchaSuccess={setCaptchaToken}
            onCaptchaError={() => {
              setCaptchaToken(undefined);
              setError("Security check failed. Please try again.");
            }}
            onCaptchaExpire={() => setCaptchaToken(undefined)}
          />
        </>
      )}

      <PrivacyPolicyLink />
    </div>
  );
}
