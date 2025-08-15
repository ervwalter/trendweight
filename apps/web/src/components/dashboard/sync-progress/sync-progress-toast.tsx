import type { SyncProgress } from "./types";

interface SyncProgressToastProps {
  progress: SyncProgress;
}

const SyncProgressToast = ({ progress }: SyncProgressToastProps) => {
  return (
    <div className="space-y-1">
      {/* Main status message */}
      {progress.message && (
        <p className="text-sm font-medium" aria-live="polite">
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

export { SyncProgressToast };
