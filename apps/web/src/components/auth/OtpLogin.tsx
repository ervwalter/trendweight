import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Turnstile } from "@marsidev/react-turnstile";
import { useAuth } from "../../lib/auth/useAuth";
import { Button } from "../ui/Button";
import { Heading } from "../ui/Heading";
import { AuthError } from "./AuthError";

type AuthStage = "email" | "otp";

interface OtpLoginProps {
  from?: string;
  onBack: () => void;
}

export function OtpLogin({ from, onBack }: OtpLoginProps) {
  const navigate = useNavigate();
  const { sendOtpCode, verifyOtpCode } = useAuth();
  const [stage, setStage] = useState<AuthStage>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string>();
  const [resendCooldown, setResendCooldown] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

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
      await sendOtpCode(email, captchaToken);

      // Success - move to OTP stage
      setStage("otp");
      setOtp(""); // Clear any previous OTP
      setResendCooldown(60); // Start cooldown for resend

      // Start cooldown timer
      cooldownTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error sending OTP:", err);
      // Handle rate limit error specifically
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("rate limit")) {
        setError("Please wait 60 seconds before requesting another code.");
      } else {
        setError(errorMessage || "Failed to send login code. Please try again.");
      }
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
      const session = await verifyOtpCode(email, otp);

      if (session) {
        // Success - navigate to dashboard or intended destination
        navigate({ to: from || "/dashboard" });
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("expired")) {
        setError("This code has expired. Please request a new one.");
      } else if (errorMessage.includes("Invalid")) {
        setError("Invalid code. Please check and try again.");
      } else {
        setError(errorMessage || "Failed to verify code. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setIsSubmitting(true);
    setError("");
    setOtp("");

    try {
      await sendOtpCode(email);

      // Success - show message and start cooldown
      setSuccessMessage("New code sent! Check your email.");
      setResendCooldown(60);

      // Start cooldown timer
      cooldownTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error resending OTP:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("rate limit")) {
        setError("Please wait 60 seconds before requesting another code.");
      } else {
        setError(errorMessage || "Failed to send new code. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setStage("email");
    setOtp("");
    setError("");
    setSuccessMessage("");
    setCaptchaToken(undefined);
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    setResendCooldown(0);
  };

  const handleOtpChange = (value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, "");
    // Limit to 6 digits
    setOtp(numericValue.slice(0, 6));
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  if (stage === "email") {
    return (
      <div className="mx-auto max-w-md">
        <Button onClick={onBack} variant="ghost" size="sm" className="mb-6 -ml-2">
          ← Back to login options
        </Button>

        <Heading level={2} className="mb-2 text-center">
          Sign in with Email
        </Heading>
        <p className="mb-6 text-center text-gray-600">Enter your email to log in to your account or create a new one</p>

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

      <p className="mb-6 text-center text-gray-600">We sent a 6-digit code to {email}. Enter it below to continue.</p>

      {error && <AuthError error={error} />}
      {successMessage && <div className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-green-700">{successMessage}</div>}

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
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isSubmitting || resendCooldown > 0}
            className="text-brand-600 hover:text-brand-700 text-sm disabled:opacity-50"
          >
            {resendCooldown > 0 ? `Send new code (${resendCooldown}s)` : "Send new code"}
          </button>
        </div>
      </form>
    </div>
  );
}
