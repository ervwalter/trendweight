import { useEffect } from "react";
import { supabase } from "@/lib/realtime/client";
import type { SyncProgress } from "./types";

export function useRealtimeSubscription(progressId: string | undefined, onProgressUpdate: (progress: SyncProgress) => void) {
  useEffect(() => {
    if (!progressId) {
      return;
    }

    // Validate progressId is a valid GUID
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(progressId)) {
      console.error("[realtime-subscription] Invalid progressId format:", progressId);
      return;
    }

    const channelName = `sync-progress:${progressId}`;

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "progress_update" }, (payload) => {
        // The backend sends the progress message in payload.payload
        if (payload.payload && payload.payload.id === progressId) {
          // console.log("[sync-progress] Received broadcast:", payload.payload);
          onProgressUpdate(payload.payload as SyncProgress);
        }
      })
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[realtime-subscription] Channel error occurred", error);
        } else if (status === "TIMED_OUT") {
          console.error("[realtime-subscription] Subscription timed out");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [progressId, onProgressUpdate]);
}
