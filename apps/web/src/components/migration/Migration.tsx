import { useNavigate } from "@tanstack/react-router";
import { useCompleteMigration } from "../../lib/api/mutations";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ExternalLink } from "../common/external-link";

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
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Welcome Back!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            TrendWeight has been updated with modern code and new features.{" "}
            <ExternalLink href="https://ewal.dev/trendweight-v2-has-launched">See what's new</ExternalLink>
          </p>

          <p className="text-muted-foreground text-sm">
            Your account has been migrated from classic TrendWeight. Your settings and provider connections have been preserved.
          </p>

          <div className="bg-primary/5 rounded-lg p-4">
            <p className="text-primary text-sm">
              <strong>Note:</strong> Your historical data will sync shortly. This may take a few minutes depending on how much data you have.
            </p>
          </div>

          <p className="text-muted-foreground text-sm italic">
            If you encounter any issues, please don't hesitate to use the contact link at the bottom of the page to share the details.
          </p>

          <Button variant="default" onClick={handleContinue} disabled={completeMutation.isPending} className="w-full">
            {completeMutation.isPending ? "Loading..." : "Continue to Dashboard"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
