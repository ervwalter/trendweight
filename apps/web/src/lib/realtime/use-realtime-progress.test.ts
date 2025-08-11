import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRealtimeProgress } from "./use-realtime-progress";

// Create mocks outside to have stable references
let mockOn = vi.fn();
let mockSubscribe = vi.fn();
let mockChannel = vi.fn();
let mockRemoveChannel = vi.fn();

vi.mock("./client", () => {
  return {
    supabase: {
      channel: vi.fn(),
      removeChannel: vi.fn(),
    },
  };
});

import { supabase } from "./client";

describe("useRealtimeProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock functions
    mockOn = vi.fn();
    mockSubscribe = vi.fn();
    mockChannel = vi.fn();
    mockRemoveChannel = vi.fn();

    // Setup default mock behavior
    mockChannel.mockReturnValue({
      on: mockOn,
      subscribe: mockSubscribe,
    });

    // Make on() chainable
    mockOn.mockReturnValue({
      on: mockOn,
      subscribe: mockSubscribe,
    });

    // Make subscribe() return the channel
    mockSubscribe.mockImplementation((callback) => {
      if (typeof callback === "function") {
        callback("SUBSCRIBED");
      }
      return { on: mockOn, subscribe: mockSubscribe };
    });

    // Update the mocked supabase
    vi.mocked(supabase).channel = mockChannel;
    vi.mocked(supabase).removeChannel = mockRemoveChannel;
  });

  it("should not subscribe when progressId is undefined", async () => {
    const { result } = renderHook(() => useRealtimeProgress(undefined));

    expect(mockChannel).not.toHaveBeenCalled();
    expect(result.current.status).toBe(null);
    expect(result.current.message).toBe(null);
    expect(result.current.providers).toBe(null);
    expect(result.current.isTerminal).toBe(false);
  });

  it("should not subscribe when progressId is invalid GUID", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useRealtimeProgress("invalid-guid"));

    expect(mockChannel).not.toHaveBeenCalled();
    expect(result.current.status).toBe(null);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[realtime-progress] Invalid progressId format:", "invalid-guid");

    consoleErrorSpy.mockRestore();
  });

  it("should subscribe to correct channel with valid progressId", async () => {
    const progressId = "550e8400-e29b-41d4-a716-446655440000";

    renderHook(() => useRealtimeProgress(progressId));

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith(`sync-progress:${progressId}`);
      expect(mockOn).toHaveBeenCalledWith("broadcast", { event: "progress_update" }, expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  it("should handle progress updates", async () => {
    const progressId = "550e8400-e29b-41d4-a716-446655440000";
    let broadcastHandler: ((payload: any) => void) | null = null;

    mockOn.mockImplementation((type, config, handler) => {
      if (type === "broadcast" && config.event === "progress_update") {
        broadcastHandler = handler;
      }
      return { on: mockOn, subscribe: mockSubscribe };
    });

    const { result } = renderHook(() => useRealtimeProgress(progressId));

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalled();
    });

    // Simulate a progress update
    act(() => {
      broadcastHandler?.({
        payload: {
          id: progressId,
          status: "running",
          message: "Syncing data...",
          providers: [{ provider: "fitbit", stage: "fetching", current: 2, total: 8 }],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe("running");
      expect(result.current.message).toBe("Syncing data...");
      expect(result.current.providers).toEqual([{ provider: "fitbit", stage: "fetching", current: 2, total: 8 }]);
      expect(result.current.isTerminal).toBe(false);
    });
  });

  it("should identify terminal states correctly", async () => {
    const progressId = "550e8400-e29b-41d4-a716-446655440000";
    let broadcastHandler: ((payload: any) => void) | null = null;

    mockOn.mockImplementation((type, config, handler) => {
      if (type === "broadcast" && config.event === "progress_update") {
        broadcastHandler = handler;
      }
      return { on: mockOn, subscribe: mockSubscribe };
    });

    const { result } = renderHook(() => useRealtimeProgress(progressId));

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalled();
    });

    // Test succeeded state
    act(() => {
      broadcastHandler?.({
        payload: {
          id: progressId,
          status: "succeeded",
          message: "Sync completed",
        },
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe("succeeded");
      expect(result.current.isTerminal).toBe(true);
    });

    // Test failed state
    act(() => {
      broadcastHandler?.({
        payload: {
          id: progressId,
          status: "failed",
          message: "Sync failed",
        },
      });
    });

    await waitFor(() => {
      expect(result.current.status).toBe("failed");
      expect(result.current.isTerminal).toBe(true);
    });
  });

  it("should cleanup subscription on unmount", async () => {
    const progressId = "550e8400-e29b-41d4-a716-446655440000";

    const { unmount } = renderHook(() => useRealtimeProgress(progressId));

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalled();
      expect(mockSubscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });
});
