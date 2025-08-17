import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSharingCode } from "./use-sharing-code";
import { useParams } from "@tanstack/react-router";

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  useParams: vi.fn(),
}));

const mockUseParams = vi.mocked(useParams);

describe("useSharingCode", () => {
  it("returns sharing code when present in params", () => {
    mockUseParams.mockReturnValue({ sharingCode: "test-sharing-code" });

    const { result } = renderHook(() => useSharingCode());

    expect(result.current).toBe("test-sharing-code");
  });

  it("returns undefined when sharingCode is not in params", () => {
    mockUseParams.mockReturnValue({});

    const { result } = renderHook(() => useSharingCode());

    expect(result.current).toBeUndefined();
  });

  it("returns undefined when params object is empty", () => {
    mockUseParams.mockReturnValue({});

    const { result } = renderHook(() => useSharingCode());

    expect(result.current).toBeUndefined();
  });

  it("uses strict: false parameter correctly", () => {
    mockUseParams.mockReturnValue({ sharingCode: "abc123" });

    renderHook(() => useSharingCode());

    expect(mockUseParams).toHaveBeenCalledWith({ strict: false });
  });
});
