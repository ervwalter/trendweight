import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { HiOutlineMail } from "react-icons/hi";
import { Layout } from "../components/Layout";
import { useAuth } from "../lib/auth/useAuth";
import { pageTitle } from "../lib/utils/pageTitle";
import { Heading } from "../components/ui/Heading";
import { Button } from "../components/ui/Button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
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
  useEffect(() => {
    const appleServicesId = import.meta.env.VITE_APPLE_SERVICES_ID;
    if (!appleServicesId) {
      return;
    }

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="appleid.auth.js"]');
    if (existingScript) {
      // If AppleID is already initialized, we're done
      if (window.AppleID) {
        return;
      }
    }

    const script = document.createElement("script");
    script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Initialize Apple ID auth after script loads
      if (window.AppleID) {
        // Generate a state value for this session
        const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem("apple_auth_state", state);

        window.AppleID.auth.init({
          clientId: appleServicesId,
          scope: "name email",
          redirectURI: `${window.location.origin}/api/auth/apple/callback`, // Backend endpoint
          state: state,
          usePopup: false, // Use redirect mode
        });
      }
    };

    document.head.appendChild(script);
  }, []);

  return (
    <>
      <title>{pageTitle("Log In")}</title>
      <Layout>
        <div className="mx-auto max-w-md py-12">
          <Heading level={1} className="text-center" display>
            Welcome
          </Heading>
          <p className="mb-8 text-center text-gray-600">Log in to your account or create a new one</p>

          {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

          {!showEmailForm ? (
            <>
              {/* Social login buttons */}
              <div className="space-y-3">
                <Button onClick={() => handleSocialLogin("google")} variant="secondary" size="lg" className="w-full justify-start gap-4">
                  <img src="/google-logo-NePEveMl.svg" alt="Google" className="h-5 w-5" />
                  <span className="flex-1 text-left">Continue with Google</span>
                </Button>

                <Button onClick={() => handleSocialLogin("microsoft")} variant="secondary" size="lg" className="w-full justify-start gap-4">
                  <img src="/microsoft-logo-BUXxQnXH.svg" alt="Microsoft" className="h-5 w-5" />
                  <span className="flex-1 text-left">Continue with Microsoft</span>
                </Button>

                <Button onClick={() => handleSocialLogin("apple")} variant="secondary" size="lg" className="w-full justify-start gap-4">
                  <img src="/apple-logo-vertically-balanced-rwLdlt8P.svg" alt="Apple" className="h-5 w-5" />
                  <span className="flex-1 text-left">Continue with Apple</span>
                </Button>
              </div>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-gray-50 px-4 font-medium text-gray-700 uppercase">or</span>
                </div>
              </div>

              {/* Email login button */}
              <Button onClick={() => setShowEmailForm(true)} variant="secondary" size="lg" className="w-full justify-start gap-4">
                <HiOutlineMail className="h-5 w-5" />
                <span className="flex-1 text-left">Continue with Email</span>
              </Button>
            </>
          ) : (
            <>
              {/* Back to social logins button */}
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

              {/* Email login form */}
              <form onSubmit={handleEmailSubmit} className="mb-6">
                <p className="mb-3 text-sm text-gray-600">Enter your email address to continue</p>
                <input
                  ref={emailInputRef}
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-brand-500 mb-4 w-full rounded-md border border-gray-300 px-4 py-3 text-base focus:border-transparent focus:ring-2 focus:outline-none"
                  placeholder="Email address"
                  required
                  disabled={isSubmitting}
                />

                {/* Turnstile CAPTCHA - shown immediately in email form */}
                {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                  <div className="mb-4 flex justify-center">
                    <Turnstile
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                      tabIndex={-1}
                      onSuccess={(token) => setCaptchaToken(token)}
                      onError={() => {
                        setCaptchaToken(undefined);
                        setError("Security check failed. Please try again.");
                      }}
                      onExpire={() => setCaptchaToken(undefined)}
                    />
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} variant="primary" size="lg" className="w-full">
                  {isSubmitting ? "Sending..." : "Continue with Email"}
                </Button>
              </form>
            </>
          )}

          <p className="mt-8 text-center text-sm text-gray-600">
            By continuing, you agree to our{" "}
            <Link to="/privacy" className="text-brand-600 hover:text-brand-700 underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </Layout>
    </>
  );
}
