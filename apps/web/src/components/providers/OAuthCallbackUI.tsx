import { Layout } from "../Layout";
import { Button } from "../ui/Button";
import { FaCheck } from "react-icons/fa";
import { useNavigate } from "@tanstack/react-router";

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
      <Layout>
        <div className="mt-12 text-center">
          <p className="text-lg text-gray-600">
            Connecting to {providerName}...
            {retryCount > 0 && (
              <span className="text-sm">
                {" "}
                (Retry {retryCount}/{maxRetries})
              </span>
            )}
          </p>
        </div>
      </Layout>
    );
  }

  // Show success state
  if (state === "success") {
    return (
      <Layout>
        <div className="mt-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-2 text-lg text-gray-700">
            <FaCheck className="text-green-600" />
            <span>Connected!</span>
          </div>
          <p className="text-sm text-gray-500">Taking you to your dashboard...</p>
        </div>
      </Layout>
    );
  }

  // Show error state
  if (state === "error" && error) {
    return (
      <Layout>
        <div className="mt-12 text-center">
          <div className="mx-auto max-w-md">
            <p className="mb-4 text-lg text-gray-700">Connection failed</p>
            <p className="mb-6 text-sm text-gray-600">{error}</p>
            {errorCode === "RATE_LIMITED" && (
              <p className="mb-6 text-xs text-gray-500">If you've made multiple connection attempts, please wait a moment before trying again.</p>
            )}
            <Button onClick={() => navigate({ to: "/link" })} variant="primary">
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Invalid state - no code/state parameters
  return (
    <Layout>
      <div className="mt-12 text-center">
        <p className="mb-4 text-lg text-gray-700">Something went wrong</p>
        <p className="mb-6 text-sm text-gray-600">Let's try connecting your {providerName} account again.</p>
        <Button onClick={() => navigate({ to: "/link" })} variant="primary">
          Connect Account
        </Button>
      </div>
    </Layout>
  );
}
