import { cn } from "../../../lib/utils";
import { Progress } from "../../ui/progress";
import { useSyncProgress } from "./hooks";
import type { SyncProgress } from "./types";

interface SyncProgressOverlayProps {
  className?: string;
}

// Calculate overall progress from provider progress
const calculateOverallProgress = (data: SyncProgress) => {
  if (!data.providers || data.providers.length === 0) {
    // No providers yet, return 0 to avoid hitch - let first provider update set the initial progress
    return 0;
  }

  const totalProgress = data.providers.reduce((total: number, provider) => {
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

    return total + providerPercent;
  }, 0);

  const averageProgress = totalProgress / data.providers.length;
  return Math.round(averageProgress);
};

const SyncProgressOverlay = ({ className = "" }: SyncProgressOverlayProps) => {
  const { progress } = useSyncProgress();

  // Only render if there's progress
  if (!progress) {
    return null;
  }

  const hasProviders = progress.providers && progress.providers.length > 0;
  const percent = hasProviders ? calculateOverallProgress(progress) : 0;

  return (
    <div className={cn("bg-background/70 ring-border space-y-2 rounded px-4 py-8 shadow-xs ring-1 backdrop-blur md:px-8", className)}>
      {/* Main progress bar - only show when there are providers */}
      {hasProviders && <Progress value={percent} className="h-2" />}

      {/* Status message */}
      {progress.message && (
        <p className="text-foreground text-sm" aria-live="polite">
          {progress.message}
        </p>
      )}

      {/* Provider-specific progress */}
      {progress.providers && progress.providers.length > 0 && (
        <div className="space-y-1">
          {progress.providers.map((provider) => (
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
