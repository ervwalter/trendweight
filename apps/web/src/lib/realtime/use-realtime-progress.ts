import { useEffect, useState } from "react";
import { supabase } from "./client";

interface ProviderProgress {
  provider: "fitbit" | "withings";
  stage: "init" | "fetching" | "merging" | "done" | "error";
  message: string | null;
  current: number | null;
  total: number | null;
}

interface SyncProgress {
  id: string;
  status: "running" | "succeeded" | "failed";
  message: string | null;
  providers: ProviderProgress[] | null;
}

interface UseRealtimeProgressResult {
  status: "running" | "succeeded" | "failed" | null;
  message: string | null;
  providers: ProviderProgress[] | null;
  isTerminal: boolean;
}

export function useRealtimeProgress(progressId: string | undefined): UseRealtimeProgressResult {
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  useEffect(() => {
    if (!progressId) {
      console.log("[realtime-progress] No progressId provided, skipping subscription");
      return;
    }

    // Validate progressId is a valid GUID
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(progressId)) {
      console.error("[realtime-progress] Invalid progressId format:", progressId);
      return;
    }

    const channelName = `sync-progress:${progressId}`;
    console.log("[realtime-progress] Subscribing to channel:", channelName);

    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "progress_update" }, (payload) => {
        console.log("[realtime-progress] Received broadcast:", payload);

        // The backend sends the progress message in payload.payload
        if (payload.payload && payload.payload.id === progressId) {
          console.log("[realtime-progress] Progress update matches our progressId");
          setProgress(payload.payload as SyncProgress);
        } else {
          console.log("[realtime-progress] Progress update for different progressId:", payload.payload?.id);
        }
      })
      .subscribe((status, error) => {
        console.log(`[realtime-progress] Subscription status: ${status}`, error ? `Error: ${error}` : "");
        if (status === "SUBSCRIBED") {
          console.log("[realtime-progress] Successfully subscribed to channel");
        } else if (status === "CHANNEL_ERROR") {
          console.error("[realtime-progress] Channel error occurred", error);
        } else if (status === "TIMED_OUT") {
          console.error("[realtime-progress] Subscription timed out");
        }
      });

    return () => {
      console.log("[realtime-progress] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [progressId]);

  return {
    status: progress?.status ?? null,
    message: progress?.message ?? null,
    providers: progress?.providers ?? null,
    isTerminal: progress?.status === "succeeded" || progress?.status === "failed",
  };
}
