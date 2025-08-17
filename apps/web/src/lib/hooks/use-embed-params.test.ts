import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEmbedParams } from "./use-embed-params";
import { useSearch } from "@tanstack/react-router";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  useSearch: vi.fn(),
}));

const mockUseSearch = vi.mocked(useSearch);

describe("useEmbedParams", () => {
  it("returns embed params when on sharing route", () => {
    const mockSearchParams = {
      embed: true,
      dark: false,
      width: 800,
      range: "3m", // This should be ignored
      mode: "weight", // This should be ignored
    };
    mockUseSearch.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useEmbedParams());

    expect(result.current).toEqual({
      embed: true,
      dark: false,
      width: 800,
    });
  });

  it("returns empty embed params when not on sharing route", () => {
    mockUseSearch.mockReturnValue(undefined);

    const { result } = renderHook(() => useEmbedParams());

    expect(result.current).toEqual({
      embed: undefined,
      dark: undefined,
      width: undefined,
    });
  });

  it("returns partial embed params when some are missing", () => {
    const mockSearchParams = {
      embed: true,
      range: "1y", // This should be ignored
    };
    mockUseSearch.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useEmbedParams());

    expect(result.current).toEqual({
      embed: true,
      dark: undefined,
      width: undefined,
    });
  });

  it("uses correct route and shouldThrow parameters", () => {
    mockUseSearch.mockReturnValue({});

    renderHook(() => useEmbedParams());

    expect(mockUseSearch).toHaveBeenCalledWith({
      from: "/u/$sharingCode",
      shouldThrow: false,
    });
  });

  it("handles null return from useSearch", () => {
    mockUseSearch.mockReturnValue(null);

    const { result } = renderHook(() => useEmbedParams());

    expect(result.current).toEqual({
      embed: undefined,
      dark: undefined,
      width: undefined,
    });
  });

  it("only extracts embed-related parameters", () => {
    const mockSearchParams = {
      embed: true,
      dark: true,
      width: 1200,
      range: "all",
      mode: "fatpercent",
      someOtherParam: "ignored",
    };
    mockUseSearch.mockReturnValue(mockSearchParams);

    const { result } = renderHook(() => useEmbedParams());

    // Should only contain embed-related params
    expect(result.current).toEqual({
      embed: true,
      dark: true,
      width: 1200,
    });

    // Should not contain sharing or other params
    expect(result.current).not.toHaveProperty("range");
    expect(result.current).not.toHaveProperty("mode");
    expect(result.current).not.toHaveProperty("someOtherParam");
  });
});
