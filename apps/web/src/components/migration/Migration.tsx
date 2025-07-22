import { Button } from "../ui/Button";
import { Heading } from "../ui/Heading";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api/client";
import { queryClient } from "../../lib/queryClient";
import { queryKeys } from "../../lib/api/queries";
import { useNavigate } from "@tanstack/react-router";

export function Migration() {
  const navigate = useNavigate();

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/profile/complete-migration", {
        method: "POST",
      });
    },
    onSuccess: async () => {
      // Invalidate and refetch profile query to ensure the migration flag is updated
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      await queryClient.refetchQueries({ queryKey: queryKeys.profile() });
      // Navigate to dashboard, replacing history to prevent back navigation
      navigate({ to: "/dashboard", replace: true });
    },
  });

  const handleContinue = () => {
    completeMutation.mutate();
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
