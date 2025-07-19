import { forwardRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Button } from "../ui/Button";

interface EmailLoginFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  onCaptchaSuccess: (token: string) => void;
  onCaptchaError: () => void;
  onCaptchaExpire: () => void;
}

export const EmailLoginForm = forwardRef<HTMLInputElement, EmailLoginFormProps>(
  ({ email, onEmailChange, onSubmit, isSubmitting, onCaptchaSuccess, onCaptchaError, onCaptchaExpire }, ref) => {
    const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    return (
      <form onSubmit={onSubmit} className="mb-6">
        <p className="mb-3 text-sm text-gray-600">Enter your email address to continue</p>
        <input
          ref={ref}
          type="email"
          id="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="focus:ring-brand-500 mb-4 w-full rounded-md border border-gray-300 px-4 py-3 text-base focus:border-transparent focus:ring-2 focus:outline-none"
          placeholder="Email address"
          required
          disabled={isSubmitting}
        />

        {/* Turnstile CAPTCHA - shown immediately in email form */}
        {turnstileSiteKey && (
          <div className="mb-4 flex justify-center">
            <Turnstile siteKey={turnstileSiteKey} tabIndex={-1} onSuccess={onCaptchaSuccess} onError={onCaptchaError} onExpire={onCaptchaExpire} />
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} variant="primary" size="lg" className="w-full">
          {isSubmitting ? "Sending..." : "Continue with Email"}
        </Button>
      </form>
    );
  },
);

EmailLoginForm.displayName = "EmailLoginForm";
