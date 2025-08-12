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
    } else if (provider.current !== null) {
      if (provider.total !== null && provider.total > 0) {
        // Use precise current/total for fetching progress (Fitbit-style with known total)
        providerPercent = Math.round((provider.current / provider.total) * 100);
      } else {
        const current = Math.max(provider.current, 1);
        // For providers without known total (Withings), use diminishing returns that approaches 99% but never reaches it.
        // Anchors at 20% for the first page and asymptotically approaches 99%.
        const start = 20; // percent at page 1
        const asymptote = 99; // never reached
        const decay = 0.95; // 0 < decay < 1, higher = slower approach
        const estimated = asymptote - (asymptote - start) * Math.pow(decay, current - 1);
        providerPercent = Math.floor(estimated); // floor ensures we never hit 99
      }
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
    <div className={cn("bg-background/70 ring-border space-y-1 rounded px-4 py-8 font-medium shadow-xs ring-1 backdrop-blur md:px-8", className)}>
      {/* Main progress bar - only show when there are providers */}
      {hasProviders && <Progress value={percent} className="h-2" />}

      {/* Status message */}
      {progress.message && (
        <p className="text-foreground md:text-md text-sm" aria-live="polite">
          {progress.message}
        </p>
      )}

      {/* Provider-specific progress */}
      {progress.providers && progress.providers.length > 0 && (
        <div className="space-y-1">
          {progress.providers.map((provider) => (
            <div key={provider.provider} className="text-foreground text-xs md:text-sm">
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
