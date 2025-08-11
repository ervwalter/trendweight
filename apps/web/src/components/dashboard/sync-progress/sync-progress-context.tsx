import { useState, useMemo, useCallback, type ReactNode } from "react";
import type { SyncProgress } from "./types";
import { useRealtimeSubscription } from "./use-realtime-subscription";
import { SyncProgressContext } from "./context";

interface SyncProgressProviderProps {
  children: ReactNode;
}

export function SyncProgressProvider({ children }: SyncProgressProviderProps) {
  const progressId = useMemo(() => crypto.randomUUID(), []);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const startProgress = useCallback(
    (message: string) => {
      setProgress({
        id: progressId,
        status: "starting",
        message,
        providers: null,
      });
    },
    [progressId],
  );

  const endProgress = useCallback(() => {
    // Clear progress entirely
    setProgress(null);
  }, []);

  const setServerProgress = useCallback(
    (serverProgress: SyncProgress) => {
      // If server says done, clear the progress entirely
      if (serverProgress.status === "done") {
        endProgress();
      } else {
        setProgress(serverProgress);
      }
    },
    [endProgress],
  );

  // Subscribe to realtime updates
  useRealtimeSubscription(progressId, setServerProgress);

  const value = useMemo(
    () => ({
      progressId,
      progress,
      startProgress,
      endProgress,
      setServerProgress,
    }),
    [progressId, progress, startProgress, endProgress, setServerProgress],
  );

  return <SyncProgressContext.Provider value={value}>{children}</SyncProgressContext.Provider>;
}
