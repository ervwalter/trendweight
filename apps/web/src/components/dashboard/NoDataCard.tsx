import { HiOutlineClock } from "react-icons/hi";
import type { ProviderSyncStatus } from "../../lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface NoDataCardProps {
  providerStatus?: Record<string, ProviderSyncStatus>;
}

export function NoDataCard({ providerStatus }: NoDataCardProps) {
  // Get provider names from providerStatus keys
  const providers = providerStatus ? Object.keys(providerStatus) : [];
  const providerNames = providers.map((provider) => (provider === "withings" ? "Withings" : "Fitbit")).join(" and ");

  // Check if there are any provider errors
  const hasProviderErrors = providerStatus && Object.values(providerStatus).some((status) => !status.success && status.error);

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <HiOutlineClock className="h-8 w-8" />
          </div>
          <CardTitle>Waiting for Data</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasProviderErrors ? (
          <>
            <p>TrendWeight couldn't retrieve your weight measurements due to a connection issue with {providerNames || "your provider"}.</p>
            <p>Please reconnect your scale account above to restore data synchronization.</p>
          </>
        ) : (
          <>
            <p>Your account is connected to {providerNames || "your provider"}, but there have been no weight measurements detected yet.</p>
            <p>Your charts and stats will appear here as soon as we detect at least one weight measurement.</p>
            <p className="italic">
              Note: TrendWeight looks for new measurements once every couple minutes, so if you go weigh yourself right now, it may be a few minutes before it
              shows up here.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
