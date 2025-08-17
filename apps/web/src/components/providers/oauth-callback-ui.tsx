import { useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OAuthCallbackUIProps {
  providerName: string;
  state: "loading" | "success" | "error" | "invalid";
  error?: string;
  errorCode?: string | null;
  retryCount?: number;
  maxRetries?: number;
}

export function OAuthCallbackUI({ providerName, state, error, errorCode, retryCount = 0, maxRetries = 2 }: OAuthCallbackUIProps) {
  const navigate = useNavigate();

  // Show loading state
  if (state === "loading") {
    return (
      <div className="mt-12 text-center">
        <p className="text-muted-foreground text-lg">
          Connecting to {providerName}...
          {retryCount > 0 && (
            <span className="text-sm">
              {" "}
              (Retry {retryCount}/{maxRetries})
            </span>
          )}
        </p>
      </div>
    );
  }

  // Show success state
  if (state === "success") {
    return (
      <div className="mt-12 text-center">
        <div className="text-foreground/80 mb-4 flex items-center justify-center gap-2 text-lg">
          <Check className="text-success h-5 w-5" />
          <span>Connected!</span>
        </div>
        <p className="text-muted-foreground text-sm">Taking you to your dashboard...</p>
      </div>
    );
  }

  // Show error state
  if (state === "error" && error) {
    return (
      <div className="mt-12 text-center">
        <div className="mx-auto max-w-md">
          <p className="text-foreground/80 mb-4 text-lg">Connection failed</p>
          <p className="text-muted-foreground mb-6 text-sm">{error}</p>
          {errorCode === "RATE_LIMITED" && (
            <p className="text-muted-foreground mb-6 text-xs">If you've made multiple connection attempts, please wait a moment before trying again.</p>
          )}
          <Button onClick={() => navigate({ to: "/link" })} variant="default">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Invalid state - no code/state parameters
  return (
    <div className="mt-12 text-center">
      <p className="text-foreground/80 mb-4 text-lg">Something went wrong</p>
      <p className="text-muted-foreground mb-6 text-sm">Let's try connecting your {providerName} account again.</p>
      <Button onClick={() => navigate({ to: "/link" })} variant="default">
        Connect Account
      </Button>
    </div>
  );
}
