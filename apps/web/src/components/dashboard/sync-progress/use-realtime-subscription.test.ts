import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { SyncProgress } from "./types";
import { useRealtimeSubscription } from "./use-realtime-subscription";

type BroadcastHandler = (message: { payload?: unknown }) => void;
type SubscribeCallback = (status: string, error?: Error) => void;

// The mocked module reads the client through a getter so each test can swap in its own fake
// (or null, for an app started without a Supabase configuration).
const realtime = vi.hoisted(() => ({ client: null as unknown }));

vi.mock("@/lib/realtime/client", () => ({
  get supabase() {
    return realtime.client;
  },
}));

function createFakeClient() {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  const client = {
    channel: vi.fn<(name: string) => typeof channel>(() => channel),
    removeChannel: vi.fn(),
  };
  return {
    client,
    channel,
    // The broadcast handler the hook registered with channel.on
    broadcast: (): BroadcastHandler => channel.on.mock.calls[0][2] as BroadcastHandler,
    // The status callback the hook passed to channel.subscribe
    onStatus: (): SubscribeCallback => channel.subscribe.mock.calls[0][0] as SubscribeCallback,
  };
}

const PROGRESS_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

const progress = (overrides: Partial<SyncProgress> = {}): SyncProgress => ({
  id: PROGRESS_ID,
  status: "running",
  message: "Fetching Withings",
  providers: null,
  ...overrides,
});

describe("useRealtimeSubscription", () => {
  let fake: ReturnType<typeof createFakeClient>;
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fake = createFakeClient();
    realtime.client = fake.client;
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    realtime.client = null;
    vi.restoreAllMocks();
  });

  it("subscribes to the progress_update broadcast on the channel named after the progress id", () => {
    renderHook(() => useRealtimeSubscription(PROGRESS_ID, vi.fn()));

    expect(fake.client.channel).toHaveBeenCalledWith(`sync-progress:${PROGRESS_ID}`);
    expect(fake.channel.on).toHaveBeenCalledWith("broadcast", { event: "progress_update" }, expect.any(Function));
    expect(fake.channel.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it("forwards broadcasts whose payload id matches the progress id", () => {
    const onProgressUpdate = vi.fn();
    renderHook(() => useRealtimeSubscription(PROGRESS_ID, onProgressUpdate));

    fake.broadcast()({ payload: progress() });

    expect(onProgressUpdate).toHaveBeenCalledTimes(1);
    expect(onProgressUpdate).toHaveBeenCalledWith(progress());
  });

  it("ignores broadcasts for a different progress id", () => {
    const onProgressUpdate = vi.fn();
    renderHook(() => useRealtimeSubscription(PROGRESS_ID, onProgressUpdate));

    fake.broadcast()({ payload: progress({ id: "7c9e6679-7425-40de-944b-e07fc1f90ae7" }) });

    expect(onProgressUpdate).not.toHaveBeenCalled();
  });

  it("ignores broadcasts without a payload", () => {
    const onProgressUpdate = vi.fn();
    renderHook(() => useRealtimeSubscription(PROGRESS_ID, onProgressUpdate));

    fake.broadcast()({});

    expect(onProgressUpdate).not.toHaveBeenCalled();
  });

  it("removes the channel on unmount", () => {
    const { unmount } = renderHook(() => useRealtimeSubscription(PROGRESS_ID, vi.fn()));
    expect(fake.client.removeChannel).not.toHaveBeenCalled();

    unmount();

    expect(fake.client.removeChannel).toHaveBeenCalledWith(fake.channel);
  });

  it("replaces the channel when the progress id changes", () => {
    const nextId = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
    const { rerender } = renderHook(({ id }) => useRealtimeSubscription(id, vi.fn()), { initialProps: { id: PROGRESS_ID } });

    rerender({ id: nextId });

    expect(fake.client.removeChannel).toHaveBeenCalledTimes(1);
    expect(fake.client.channel.mock.calls.map(([name]) => name)).toEqual([`sync-progress:${PROGRESS_ID}`, `sync-progress:${nextId}`]);
  });

  it.each(["not-a-guid", "0f8fad5b-d9cb-469f-a165-70867728950", "0f8fad5bd9cb469fa16570867728950e", "sync-progress:0f8fad5b-d9cb-469f-a165-70867728950e"])(
    "refuses to subscribe with the malformed progress id %s",
    (progressId) => {
      renderHook(() => useRealtimeSubscription(progressId, vi.fn()));

      expect(fake.client.channel).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalledWith("[realtime-subscription] Invalid progressId format:", progressId);
    },
  );

  it("accepts an upper-case GUID", () => {
    renderHook(() => useRealtimeSubscription(PROGRESS_ID.toUpperCase(), vi.fn()));

    expect(fake.client.channel).toHaveBeenCalledWith(`sync-progress:${PROGRESS_ID.toUpperCase()}`);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does nothing without a progress id", () => {
    renderHook(() => useRealtimeSubscription(undefined, vi.fn()));

    expect(fake.client.channel).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("does nothing when realtime is not configured", () => {
    realtime.client = null;

    const { unmount } = renderHook(() => useRealtimeSubscription(PROGRESS_ID, vi.fn()));
    unmount();

    expect(fake.client.channel).not.toHaveBeenCalled();
    expect(fake.client.removeChannel).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("logs channel errors and timeouts but stays quiet on a successful subscription", () => {
    renderHook(() => useRealtimeSubscription(PROGRESS_ID, vi.fn()));
    const onStatus = fake.onStatus();

    onStatus("SUBSCRIBED");
    expect(consoleError).not.toHaveBeenCalled();

    const error = new Error("socket closed");
    onStatus("CHANNEL_ERROR", error);
    expect(consoleError).toHaveBeenCalledWith("[realtime-subscription] Channel error occurred", error);

    onStatus("TIMED_OUT");
    expect(consoleError).toHaveBeenCalledWith("[realtime-subscription] Subscription timed out");
  });
});
