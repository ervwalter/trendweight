import { Clock } from "lucide-react";
import type { ProviderSyncStatus } from "@/lib/api/types";
import { getProviderDisplayName } from "@/lib/utils/provider-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NoDataCardProps {
  providerStatus?: Record<string, ProviderSyncStatus>;
}

export function NoDataCard({ providerStatus }: NoDataCardProps) {
  // Get provider names from providerStatus keys (manual isn't a syncing provider)
  const providers = providerStatus ? Object.keys(providerStatus).filter((provider) => provider !== "manual" && provider !== "legacy") : [];
  const providerNames = providers.map(getProviderDisplayName).join(" and ");

  // Check if there are any provider errors ("disabled" is a permanent shutdown, not a
  // connection issue - the reconnect advice below would be wrong for it)
  const hasProviderErrors = providerStatus && Object.values(providerStatus).some((status) => !status.success && status.error && status.error !== "disabled");

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Clock className="h-8 w-8" />
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
        ) : providers.length === 0 ? (
          <>
            <p>There are no weight measurements in your account yet.</p>
            <p>Connect a smart scale from the settings page, or log a weight yourself below to get started.</p>
          </>
        ) : (
          <>
            <p>Your account is connected to {providerNames || "your provider"}, but there have been no weight measurements detected yet.</p>
            <p>Your charts and stats will appear here as soon as we detect at least one weight measurement.</p>
            <p className="italic">
              Note: TrendWeight looks for new measurements once every couple minutes, so if you go weigh yourself right now, it may be a few minutes before it
              shows up here.
            </p>
            <p>You can also log a weight yourself below.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
