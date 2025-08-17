import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSharingSearchParams } from "./use-sharing-search-params";
import { useSearch } from "@tanstack/react-router";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  useSearch: vi.fn(),
}));

const mockUseSearch = vi.mocked(useSearch);

describe("useSharingSearchParams", () => {
  it("returns sharing params when on sharing route", () => {
    const mockSearchParams = {
      range: "3m" as const,
      mode: "weight" as const,
      embed: true, // This should be ignored
      dark: false, // This should be ignored
      width: 800, // This should be ignored
    };
    mockUseSearch.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useSharingSearchParams());

    expect(result.current).toEqual({
      range: "3m",
      mode: "weight",
    });
  });

  it("returns empty sharing params when not on sharing route", () => {
    mockUseSearch.mockReturnValue(undefined);

    const { result } = renderHook(() => useSharingSearchParams());

    expect(result.current).toEqual({
      range: undefined,
      mode: undefined,
    });
  });

  it("returns partial sharing params when some are missing", () => {
    const mockSearchParams = {
      range: "1y" as const,
      embed: true, // This should be ignored
    };
    mockUseSearch.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useSharingSearchParams());

    expect(result.current).toEqual({
      range: "1y",
      mode: undefined,
    });
  });

  it("uses correct route and shouldThrow parameters", () => {
    mockUseSearch.mockReturnValue({});

    renderHook(() => useSharingSearchParams());

    expect(mockUseSearch).toHaveBeenCalledWith({
      from: "/u/$sharingCode",
      shouldThrow: false,
    });
  });

  it("handles null return from useSearch", () => {
    mockUseSearch.mockReturnValue(null);

    const { result } = renderHook(() => useSharingSearchParams());

    expect(result.current).toEqual({
      range: undefined,
      mode: undefined,
    });
  });

  it("only extracts sharing-related parameters", () => {
    const mockSearchParams = {
      range: "all" as const,
      mode: "fatpercent" as const,
      embed: true, // Should be ignored
      dark: true, // Should be ignored
      width: 1200, // Should be ignored
      someOtherParam: "ignored", // Should be ignored
    };
    mockUseSearch.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useSharingSearchParams());

    // Should only contain sharing-related params
    expect(result.current).toEqual({
      range: "all",
      mode: "fatpercent",
    });

    // Should not contain embed or other params
    expect(result.current).not.toHaveProperty("embed");
    expect(result.current).not.toHaveProperty("dark");
    expect(result.current).not.toHaveProperty("width");
    expect(result.current).not.toHaveProperty("someOtherParam");
  });
});
