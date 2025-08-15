import { useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { SyncProgressContext } from "./context";
import { SyncProgressToast } from "./sync-progress-toast";
import { createElement } from "react";

export function useSyncProgress() {
  const context = useContext(SyncProgressContext);
  const [toastId, setToastId] = useState<string | null>(null);

  if (!context) {
    throw new Error("useSyncProgress must be used within SyncProgressProvider");
  }

  // Manage toast lifecycle
  useEffect(() => {
    if (context.progress && !toastId) {
      // Create toast
      const id = toast(createElement(SyncProgressToast, { progress: context.progress }), {
        duration: Infinity,
        dismissible: false,
        closeButton: false,
      });
      setToastId(id as string);
    } else if (context.progress && toastId) {
      // Update existing toast
      toast(createElement(SyncProgressToast, { progress: context.progress }), { id: toastId });
    } else if (!context.progress && toastId) {
      // Dismiss and clear
      toast.dismiss(toastId);
      setToastId(null);
    }
  }, [context.progress, toastId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (toastId) {
        toast.dismiss(toastId);
      }
    };
  }, [toastId]);

  return context;
}

export function useSyncProgressId() {
  const { progressId } = useSyncProgress();
  return progressId;
}
