import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../auth/use-auth";
import { getAuthenticatedSupabaseClient } from "./client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ProviderProgress {
  provider: "fitbit" | "withings";
  stage: "init" | "fetching" | "merging" | "done" | "error";
  current: number | null;
  total: number | null;
  percent: number | null;
  message: string | null;
}

interface SyncProgress {
  id: string;
  uid: string;
  external_id: string;
  provider: "fitbit" | "withings" | "all";
  status: "running" | "succeeded" | "failed";
  providers: ProviderProgress[] | null;
  percent: number | null;
  message: string | null;
  started_at: string;
  updated_at: string;
}

interface UseRealtimeProgressResult {
  status: "running" | "succeeded" | "failed" | null;
  percent: number | null;
  message: string | null;
  providers: ProviderProgress[] | null;
  isTerminal: boolean;
}

export function useRealtimeProgress(progressId: string | undefined): UseRealtimeProgressResult {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Get the token getter from auth
  const auth = useAuth();
  const getToken = auth?.getToken ?? null;

  console.log("[realtime-progress] Hook initialized with progressId:", progressId, "auth available:", !!auth, "getToken available:", !!getToken);

  const handleProgressUpdate = useCallback((payload: SyncProgress) => {
    console.log("[realtime-progress] Progress update received:", payload);
    setProgress(payload);
  }, []);

  useEffect(() => {
    console.log("[realtime-progress] useEffect triggered - progressId:", progressId, "getToken:", !!getToken);

    if (!progressId || !getToken) {
      console.log("[realtime-progress] Skipping subscription setup - missing progressId or getToken");
      return;
    }

    const setupSubscription = async () => {
      try {
        // Create authenticated Supabase client with Clerk JWT getter
        const supabaseClient = await getAuthenticatedSupabaseClient(getToken);

        // Clean up any existing subscription
        if (channelRef.current) {
          await supabaseClient.removeChannel(channelRef.current);
        }

        // Subscribe to Broadcast messages for sync progress
        // Use user-specific secure channel
        const userId = auth?.user?.uid;
        if (!userId) {
          console.error("[realtime-progress] No user ID available for subscription");
          return;
        }

        const channelName = `sync-progress:${userId}:${progressId}`;
        console.log(`[realtime-progress] Subscribing to Broadcast on secure topic: ${channelName} for progressId: ${progressId}`);

        channelRef.current = supabaseClient
          .channel(channelName)
          .on(
            "broadcast",
            {
              event: "progress_update",
            },
            (payload) => {
              console.log("[realtime-progress] Received broadcast message:", payload);
              // Check if the message is for our progressId
              if (payload.payload && payload.payload.id === progressId) {
                console.log("[realtime-progress] Broadcast matches our progressId:", progressId);
                handleProgressUpdate(payload.payload as SyncProgress);
              } else {
                console.log("[realtime-progress] Broadcast for different progressId:", payload.payload?.id);
              }
            },
          )
          .subscribe((status, error) => {
            console.log(`[realtime-progress] Subscription status: ${status}`, error ? `Error: ${JSON.stringify(error)}` : "");
            if (status === "SUBSCRIBED") {
              console.log("[realtime-progress] Successfully subscribed to channel");
            } else if (status === "CHANNEL_ERROR") {
              console.error("[realtime-progress] Channel error occurred", error);
            } else if (status === "TIMED_OUT") {
              console.error("[realtime-progress] Subscription timed out");
            } else if (status === "CLOSED") {
              console.log("[realtime-progress] Channel closed");
            }
          });
      } catch (error) {
        console.error("[realtime-progress] Failed to setup subscription:", error);
      }
    };

    setupSubscription();

    return () => {
      // Cleanup subscription on unmount
      const cleanup = async () => {
        if (channelRef.current && getToken) {
          console.log("[realtime-progress] Cleaning up subscription");
          try {
            // Create authenticated client for cleanup
            const supabaseClient = await getAuthenticatedSupabaseClient(getToken);
            await supabaseClient.removeChannel(channelRef.current);
            channelRef.current = null;
          } catch (error) {
            console.error("[realtime-progress] Error during cleanup:", error);
          }
        }
      };
      cleanup();
    };
  }, [progressId, getToken, handleProgressUpdate, auth?.user?.uid]);

  // Log when terminal state is reached (no invalidation needed - the API response will update the data)
  useEffect(() => {
    if (progress?.status === "succeeded" || progress?.status === "failed") {
      console.log("[realtime-progress] Terminal state reached");
    }
  }, [progress?.status]);

  return {
    status: progress?.status ?? null,
    percent: progress?.percent ?? null,
    message: progress?.message ?? null,
    providers: progress?.providers ?? null,
    isTerminal: progress?.status === "succeeded" || progress?.status === "failed",
  };
}
