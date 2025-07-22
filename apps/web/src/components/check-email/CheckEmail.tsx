import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { HiOutlineMail } from "react-icons/hi";
import { useAuth } from "../../lib/auth/useAuth";
import { Heading } from "../ui/Heading";
import { Button } from "../ui/Button";

export function CheckEmail() {
  const { sendLoginEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    // Get email from URL params
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleResend = async () => {
    if (!canResend || isResending || !email) return;

    setIsResending(true);
    setError("");

    try {
      await sendLoginEmail(email);
      setIsResending(false);
      setCanResend(false);
      setResendCountdown(30);

      // Restart countdown
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error resending login email:", err);
      setError("Failed to resend email. Please try again.");
      setIsResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="bg-brand-100 text-brand-600 mb-6 inline-flex items-center justify-center rounded-full p-4">
        <HiOutlineMail className="h-8 w-8" />
      </div>

      <Heading level={1} display>
        Check your email!
      </Heading>

      <p className="mb-2 text-lg text-gray-600">We sent a login link to</p>

      <p className="mb-8 text-lg font-medium">{email || "your email address"}</p>

      <p className="mb-8 text-gray-600">Open the link in your email to continue. This link will expire in 1 hour.</p>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!canResend ? (
        <p className="text-sm text-gray-500">Didn't get it? You can request a new link in {resendCountdown} seconds</p>
      ) : (
        <Button onClick={handleResend} disabled={isResending} variant="ghost" className="underline">
          {isResending ? "Sending..." : "Send again"}
        </Button>
      )}

      <div className="mt-8 border-t border-gray-200 pt-8">
        <p className="text-sm text-gray-600">
          Wrong email?{" "}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 underline">
            Try again
          </Link>
        </p>
      </div>
    </div>
  );
}
