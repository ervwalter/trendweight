import { useContext } from "react";
import { SyncProgressContext } from "./context";

export function useSyncProgress() {
  const context = useContext(SyncProgressContext);

  if (!context) {
    throw new Error("useSyncProgress must be used within a SyncProgressProvider");
  }

  // Return only what components should use, not internal functions
  return {
    progressId: context.progressId,
    progress: context.progress,
    startProgress: context.startProgress,
    endProgress: context.endProgress,
  };
}
