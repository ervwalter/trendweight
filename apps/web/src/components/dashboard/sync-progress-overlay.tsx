import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "../ui/progress";
import { useRealtimeProgress } from "../../lib/realtime/use-realtime-progress";
import { queryKeys } from "../../lib/api/queries";

interface SyncProgressOverlayProps {
  progressId?: string;
  sharingCode?: string;
  className?: string;
}

const SyncProgressOverlay = ({ progressId, sharingCode, className = "" }: SyncProgressOverlayProps) => {
  const progressData = useRealtimeProgress(progressId);
  const queryClient = useQueryClient();

  // Check if React Query is currently fetching data in the background
  const dataQueryKey = queryKeys.data(sharingCode);
  const queryState = queryClient.getQueryState(dataQueryKey);
  const isReactQueryFetching = queryState?.fetchStatus === "fetching";

  // Calculate overall progress from provider progress
  const calculateOverallProgress = (data: ReturnType<typeof useRealtimeProgress>) => {
    if (!data.providers || data.providers.length === 0) {
      // No providers yet, return 0 to avoid hitch - let first provider update set the initial progress
      return 0;
    }

    const totalWeight = data.providers.reduce((total, provider) => {
      let providerPercent = 0;

      if (provider.stage === "done") {
        providerPercent = 100;
      } else if (provider.stage === "fetching" && provider.current !== null) {
        if (provider.total !== null && provider.total > 0) {
          // Use precise current/total for fetching progress (Fitbit-style with known total)
          providerPercent = Math.round((provider.current / provider.total) * 100);
        } else {
          // For providers without known total (Withings), estimate based on current page
          // First page = 20%, subsequent pages add diminishing returns
          providerPercent = Math.min(20 + provider.current * 15, 80);
        }
      } else if (provider.stage === "init") {
        providerPercent = 5;
      } else if (provider.stage === "fetching") {
        providerPercent = 10; // fallback if no current/total
      } else if (provider.stage === "merging") {
        providerPercent = 90;
      }

      console.log(`[progress-calc] Provider ${provider.provider}: ${provider.stage} ${provider.current}/${provider.total} = ${providerPercent}%`);
      return total + providerPercent;
    }, 0);

    const averageWeight = totalWeight / data.providers.length;
    const result = Math.round(averageWeight);
    console.log(`[progress-calc] Total: ${totalWeight}, Average: ${averageWeight}, Rounded: ${result}%`);
    return result;
  };

  const { status, message, providers } = progressData;
  const percent = calculateOverallProgress(progressData);

  // Show progress overlay if either realtime sync is active or React Query is refetching
  const showProgress = status === "running" || isReactQueryFetching;

  // Only render if there's actually progress to show AND we have provider updates
  if (!showProgress || !providers || providers.length === 0) {
    return null;
  }

  return (
    <div className={`bg-background/80 ring-border space-y-2 rounded p-3 shadow ring-1 backdrop-blur ${className}`}>
      {/* Main progress bar */}
      <Progress value={percent} className="h-2" />

      {/* Status message */}
      {message && (
        <p className="text-foreground text-sm" aria-live="polite">
          {message}
        </p>
      )}

      {/* Provider-specific progress */}
      {providers && providers.length > 0 && (
        <div className="space-y-1">
          {providers.map((provider) => (
            <div key={provider.provider} className="text-muted-foreground text-xs">
              {provider.provider === "fitbit" ? "Fitbit" : "Withings"}:{" "}
              {provider.message ||
                (provider.stage === "init"
                  ? "Starting..."
                  : provider.stage === "fetching"
                    ? "Fetching data..."
                    : provider.stage === "merging"
                      ? "Processing data..."
                      : provider.stage === "done"
                        ? "Complete"
                        : provider.stage)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { SyncProgressOverlay };
