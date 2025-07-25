import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Turnstile } from "@marsidev/react-turnstile";
import { supabase } from "../../lib/supabase/client";
import { Button } from "../ui/Button";
import { Heading } from "../ui/Heading";
import { AuthError } from "./AuthError";

type AuthStage = "email" | "otp";

export function OtpLogin({ from }: { from?: string }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState<AuthStage>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string>();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  // Focus management
  useEffect(() => {
    if (stage === "email" && emailInputRef.current) {
      const timer = setTimeout(() => emailInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    } else if (stage === "otp" && otpInputRef.current) {
      const timer = setTimeout(() => otpInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Check if captcha is required and not completed
    if (turnstileSiteKey && !captchaToken) {
      setError("Please complete the security check.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          captchaToken,
        },
      });

      if (error) {
        // Handle rate limit error specifically
        if (error.message?.includes("rate limit")) {
          setError("Please wait 60 seconds before requesting another code.");
        } else {
          setError(error.message || "Failed to send login code. Please try again.");
        }
        setCaptchaToken(undefined);
      } else {
        // Move to OTP stage
        setStage("otp");
        setOtp(""); // Clear any previous OTP
      }
    } catch (err) {
      console.error("Error sending OTP:", err);
      setError("Failed to send login code. Please try again.");
      setCaptchaToken(undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setIsSubmitting(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        if (error.message?.includes("expired")) {
          setError("This code has expired. Please request a new one.");
        } else if (error.message?.includes("Invalid")) {
          setError("Invalid code. Please check and try again.");
        } else {
          setError(error.message || "Failed to verify code. Please try again.");
        }
      } else if (data.session) {
        // Success - navigate to dashboard or intended destination
        navigate({ to: from || "/dashboard" });
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setError("Failed to verify code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setIsSubmitting(true);
    setError("");
    setOtp("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        if (error.message?.includes("rate limit")) {
          setError("Please wait 60 seconds before requesting another code.");
        } else {
          setError(error.message || "Failed to send new code. Please try again.");
        }
      } else {
        setError(""); // Clear any previous errors
        // Show success message briefly
        setError("New code sent! Check your email.");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error("Error resending OTP:", err);
      setError("Failed to send new code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setStage("email");
    setOtp("");
    setError("");
    setCaptchaToken(undefined);
  };

  const handleOtpChange = (value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, "");
    // Limit to 6 digits
    setOtp(numericValue.slice(0, 6));
  };

  if (stage === "email") {
    return (
      <div className="mx-auto max-w-md">
        <Heading level={2} className="mb-6 text-center">
          Sign in with Email
        </Heading>

        {error && <AuthError error={error} />}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              ref={emailInputRef}
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus:ring-brand-500 w-full rounded-md border border-gray-300 px-4 py-3 text-base focus:border-transparent focus:ring-2 focus:outline-none"
              placeholder="Email address"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Turnstile CAPTCHA */}
          {turnstileSiteKey && (
            <div className="flex justify-center">
              <Turnstile
                siteKey={turnstileSiteKey}
                tabIndex={-1}
                onSuccess={setCaptchaToken}
                onError={() => {
                  setCaptchaToken(undefined);
                  setError("Security check failed. Please try again.");
                }}
                onExpire={() => setCaptchaToken(undefined)}
              />
            </div>
          )}

          <Button type="submit" disabled={isSubmitting || !email.trim()} variant="primary" size="lg" className="w-full">
            {isSubmitting ? "Sending..." : "Continue with Email"}
          </Button>
        </form>
      </div>
    );
  }

  // OTP stage
  return (
    <div className="mx-auto max-w-md">
      <Heading level={2} className="mb-6 text-center">
        Enter Your Code
      </Heading>

      <p className="mb-6 text-center text-gray-600">Enter the 6-digit code sent to {email}</p>

      {error && <AuthError error={error} />}

      <form onSubmit={handleOtpSubmit} className="space-y-4">
        <div>
          <label htmlFor="otp" className="mb-2 block text-sm font-medium text-gray-700">
            Verification code
          </label>
          <input
            ref={otpInputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            id="otp"
            value={otp}
            onChange={(e) => handleOtpChange(e.target.value)}
            className="focus:ring-brand-500 w-full rounded-md border border-gray-300 px-4 py-3 text-center font-mono text-2xl tracking-widest focus:border-transparent focus:ring-2 focus:outline-none"
            placeholder="000000"
            maxLength={6}
            required
            disabled={isSubmitting}
            autoComplete="one-time-code"
          />
          <p className="mt-2 text-sm text-gray-500">Code expires in 1 hour</p>
        </div>

        <Button type="submit" disabled={isSubmitting || otp.length !== 6} variant="primary" size="lg" className="w-full">
          {isSubmitting ? "Verifying..." : "Verify Code"}
        </Button>

        <div className="flex justify-between text-sm">
          <button type="button" onClick={handleChangeEmail} disabled={isSubmitting} className="text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50">
            Change email
          </button>
          <button type="button" onClick={handleResendCode} disabled={isSubmitting} className="text-brand-600 hover:text-brand-700 text-sm disabled:opacity-50">
            Send new code
          </button>
        </div>
      </form>
    </div>
  );
}
