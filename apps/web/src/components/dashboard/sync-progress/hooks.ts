import { useContext } from "react";
import { SyncProgressContext } from "./context";

export function useSyncProgress() {
  const context = useContext(SyncProgressContext);
  if (!context) {
    throw new Error("useSyncProgress must be used within SyncProgressProvider");
  }
  return context;
}

export function useSyncProgressId() {
  const { progressId } = useSyncProgress();
  return progressId;
}
