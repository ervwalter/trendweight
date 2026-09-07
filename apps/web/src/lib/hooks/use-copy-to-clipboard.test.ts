import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./use-copy-to-clipboard";

describe("useCopyToClipboard", () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("copies the value and reports copied until the reset window elapses", async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(() => result.current.copy("hello"));

    expect(writeText).toHaveBeenCalledWith("hello");
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
  });

  it("restarts the reset window on a second copy", async () => {
    const { result } = renderHook(() => useCopyToClipboard(1000));

    await act(() => result.current.copy("one"));
    act(() => {
      vi.advanceTimersByTime(800);
    });
    await act(() => result.current.copy("two"));
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(result.current.copied).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("stays uncopied and logs when the clipboard rejects", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValue(new Error("denied"));
    const { result } = renderHook(() => useCopyToClipboard());

    await act(() => result.current.copy("hello"));

    expect(result.current.copied).toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });

  it("clears the pending reset timer on unmount", async () => {
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    await act(() => result.current.copy("hello"));
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
