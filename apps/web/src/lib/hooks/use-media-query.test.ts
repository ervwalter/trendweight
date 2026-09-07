import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useIsMobile, useMediaQuery } from "./use-media-query";

type ChangeListener = (event: MediaQueryListEvent) => void;

// A controllable stand-in for window.matchMedia: records the queries it was asked for and
// lets a test flip the match state, notifying whoever subscribed to "change".
function installMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>();
  const queries: string[] = [];
  const mediaQueryList = {
    matches: initialMatches,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn((_type: string, listener: ChangeListener) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: ChangeListener) => {
      listeners.delete(listener);
    }),
  };
  const matchMedia = vi.fn((query: string) => {
    queries.push(query);
    mediaQueryList.media = query;
    return mediaQueryList as unknown as MediaQueryList;
  });
  window.matchMedia = matchMedia;

  return {
    mediaQueryList,
    queries,
    listenerCount: () => listeners.size,
    setMatches(matches: boolean) {
      mediaQueryList.matches = matches;
      act(() => {
        for (const listener of listeners) {
          listener({ matches, media: mediaQueryList.media } as MediaQueryListEvent);
        }
      });
    },
  };
}

describe("useMediaQuery", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("reports the current match state on first render", () => {
    installMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));

    expect(result.current).toBe(true);
  });

  it("asks matchMedia for the query it was given", () => {
    const media = installMatchMedia(false);

    renderHook(() => useMediaQuery("(min-width: 1024px)"));

    expect(media.queries).toContain("(min-width: 1024px)");
    expect(new Set(media.queries).size).toBe(1);
  });

  it("subscribes to change events and follows the new match state", () => {
    const media = installMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(media.mediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    media.setMatches(true);
    expect(result.current).toBe(true);

    media.setMatches(false);
    expect(result.current).toBe(false);
  });

  it("removes its change listener on unmount", () => {
    const media = installMatchMedia(false);

    const { unmount } = renderHook(() => useMediaQuery("(max-width: 767px)"));
    expect(media.listenerCount()).toBe(1);

    unmount();

    expect(media.mediaQueryList.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(media.listenerCount()).toBe(0);
  });

  it("re-subscribes when the query changes", () => {
    const media = installMatchMedia(false);

    const { rerender } = renderHook(({ query }) => useMediaQuery(query), { initialProps: { query: "(max-width: 767px)" } });

    rerender({ query: "(min-width: 1280px)" });

    expect(media.queries).toEqual(["(max-width: 767px)", "(max-width: 767px)", "(min-width: 1280px)"]);
    expect(media.mediaQueryList.removeEventListener).toHaveBeenCalledTimes(1);
    expect(media.listenerCount()).toBe(1);
  });
});

describe("useIsMobile", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("matches viewports narrower than Tailwind's md breakpoint", () => {
    const media = installMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(media.queries[0]).toBe("(max-width: 767px)");
    expect(result.current).toBe(true);
  });

  it("is false on wider viewports", () => {
    installMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });
});
