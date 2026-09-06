import { act, renderHook } from "@testing-library/react";
import { useContext, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncProgressContext } from "./context";
import { SyncProgressProvider } from "./sync-progress-context";
import type { SyncProgress } from "./types";

// Capture the callback handed to the realtime subscription so the test can observe its
// identity and drive it as if a broadcast had arrived
const subscriptions: Array<(progress: SyncProgress) => void> = [];
vi.mock("./use-realtime-subscription", () => ({
  useRealtimeSubscription: (_progressId: string, onProgressUpdate: (progress: SyncProgress) => void) => {
    subscriptions.push(onProgressUpdate);
  },
}));

vi.mock("sonner", () => ({
  toast: Object.assign(
    vi.fn(() => "toast-id"),
    { dismiss: vi.fn() },
  ),
}));

function renderProvider() {
  const wrapper = ({ children }: { children: ReactNode }) => <SyncProgressProvider disableUI>{children}</SyncProgressProvider>;
  return renderHook(() => useContext(SyncProgressContext)!, { wrapper });
}

describe("SyncProgressProvider", () => {
  beforeEach(() => {
    subscriptions.length = 0;
  });

  it("keeps the realtime callback stable when a sync starts so the channel is not re-created", () => {
    const { result } = renderProvider();
    const callbackBeforeStart = subscriptions.at(-1);

    act(() => result.current.startProgress("Getting updated data..."));

    expect(result.current.progress?.status).toBe("starting");
    expect(subscriptions.at(-1)).toBe(callbackBeforeStart);
  });

  it("applies broadcasts that arrive while a sync is active", () => {
    const { result } = renderProvider();
    const onProgressUpdate = subscriptions.at(-1)!;

    act(() => result.current.startProgress("Getting updated data..."));
    act(() =>
      onProgressUpdate({
        id: result.current.progressId,
        status: "running",
        message: "Fetching from Withings",
        providers: null,
      }),
    );

    expect(result.current.progress).toMatchObject({ status: "running", message: "Fetching from Withings" });

    act(() => onProgressUpdate({ id: result.current.progressId, status: "done", message: null, providers: null }));

    expect(result.current.progress).toBeNull();
  });

  it("ignores broadcasts when no sync is active", () => {
    const { result } = renderProvider();
    const onProgressUpdate = subscriptions.at(-1)!;

    act(() => onProgressUpdate({ id: result.current.progressId, status: "running", message: "stale", providers: null }));

    expect(result.current.progress).toBeNull();
  });
});
