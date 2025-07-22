import { Button } from "../ui/Button";
import { Heading } from "../ui/Heading";
import { useCompleteMigration } from "../../lib/api/mutations";
import { useNavigate } from "@tanstack/react-router";

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
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6 text-center">
          <Heading level={1}>Welcome Back!</Heading>
          <p className="mt-2 text-gray-600">
            We've successfully migrated your profile from classic TrendWeight. Your settings and provider connections have been preserved.
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-800">Your historical data will sync shortly. This may take a few minutes depending on how much data you have.</p>
          </div>

          <Button variant="primary" onClick={handleContinue} disabled={completeMutation.isPending} className="w-full">
            {completeMutation.isPending ? "Loading..." : "Continue to Dashboard"}
          </Button>
        </div>
      </div>
    </div>
  );
}
