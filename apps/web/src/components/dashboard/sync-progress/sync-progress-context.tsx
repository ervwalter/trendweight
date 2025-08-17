import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { createElement } from "react";
import type { SyncProgress } from "./types";
import { useRealtimeSubscription } from "./use-realtime-subscription";
import { SyncProgressContext } from "./context";
import { SyncProgressToast } from "./sync-progress-toast";

interface SyncProgressProviderProps {
  children: ReactNode;
  disableUI?: boolean;
}

export function SyncProgressProvider({ children, disableUI = false }: SyncProgressProviderProps) {
  const progressId = useMemo(() => crypto.randomUUID(), []);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [toastId, setToastId] = useState<string | null>(null);

  // Manage toast lifecycle at the provider level
  useEffect(() => {
    // Skip toast management if UI is disabled
    if (disableUI) {
      return;
    }

    if (progress && !toastId) {
      // Create toast
      const id = toast(createElement(SyncProgressToast, { progress }), {
        duration: Infinity,
        dismissible: false,
        closeButton: false,
      });
      setToastId(id as string);
    } else if (progress && toastId) {
      // Update existing toast
      toast(createElement(SyncProgressToast, { progress }), { id: toastId });
    } else if (!progress && toastId) {
      // Dismiss and clear
      toast.dismiss(toastId);
      setToastId(null);
    }
  }, [progress, toastId, disableUI]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (toastId) {
        toast.dismiss(toastId);
      }
    };
  }, [toastId]);

  const startProgress = useCallback(
    (message: string) => {
      setIsActive(true);
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
    // Mark as inactive and clear progress entirely
    setIsActive(false);
    setProgress(null);
  }, []);

  const setServerProgress = useCallback(
    (serverProgress: SyncProgress) => {
      // Ignore broadcasts if no active progress session
      if (!isActive) {
        return;
      }

      // If server says done, clear the progress entirely
      if (serverProgress.status === "done") {
        endProgress();
      } else {
        setProgress(serverProgress);
      }
    },
    [isActive, endProgress],
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
