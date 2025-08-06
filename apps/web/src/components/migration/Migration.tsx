import { useNavigate } from "@tanstack/react-router";
import { useCompleteMigration } from "../../lib/api/mutations";
import { Button } from "../ui/button";
import { ExternalLink } from "../ui/ExternalLink";
import { Heading } from "../ui/Heading";

export function Migration() {
  const navigate = useNavigate();
  const completeMutation = useCompleteMigration();

  const handleContinue = () => {
    completeMutation.mutate(undefined, {
      onSuccess: () => {
        // Navigate to dashboard, replacing history to prevent back navigation
        navigate({ to: "/dashboard", replace: true });
      },
    });
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <Heading level={1} className="mb-6 text-center">
          Welcome Back!
        </Heading>

        <p className="mb-4 text-sm text-gray-600">
          TrendWeight has been updated with modern code and new features.{" "}
          <ExternalLink href="https://ewal.dev/trendweight-v2-has-launched">See what's new</ExternalLink>
        </p>

        <p className="mb-4 text-sm text-gray-600">
          Your account has been migrated from classic TrendWeight. Your settings and provider connections have been preserved.
        </p>

        <div className="bg-brand-50 mb-6 rounded-lg p-4">
          <p className="text-brand-800 text-sm">
            <strong>Note:</strong> Your historical data will sync shortly. This may take a few minutes depending on how much data you have.
          </p>
        </div>

        <p className="mb-6 text-sm text-gray-600 italic">
          If you encounter any issues, please don't hesitate to use the contact link at the bottom of the page to share the details.
        </p>

        <Button variant="default" onClick={handleContinue} disabled={completeMutation.isPending} className="w-full">
          {completeMutation.isPending ? "Loading..." : "Continue to Dashboard"}
        </Button>
      </div>
    </div>
  );
}
