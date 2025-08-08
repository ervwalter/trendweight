import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { Link } from "./link";

// Mock dependencies
const mockUseSearch = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mockUseSearch(),
}));

const mockShowToast = vi.fn();
vi.mock("../../lib/hooks/use-toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

// Mock ProviderList component
vi.mock("../providers/provider-list", () => ({
  ProviderList: ({ variant, showHeader }: any) => (
    <div data-testid="provider-list">
      <div>Variant: {variant}</div>
      <div>Show Header: {showHeader ? "true" : "false"}</div>
    </div>
  ),
}));

describe("Link", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.mockReturnValue({
      provider: undefined,
      success: undefined,
      error: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render ProviderList with correct props", () => {
    const { container } = render(<Link />);

    const providerList = container.querySelector('[data-testid="provider-list"]');
    expect(providerList).toHaveTextContent("Variant: link");
    expect(providerList).toHaveTextContent("Show Header: true");
  });

  it("should show success toast for Fitbit connection", async () => {
    mockUseSearch.mockReturnValue({
      provider: "fitbit",
      success: "true",
      error: undefined,
    });

    render(<Link />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Connection Successful",
        description: "Successfully connected Fitbit account!",
        variant: "success",
      });
    });
  });

  it("should show success toast for Withings connection", async () => {
    mockUseSearch.mockReturnValue({
      provider: "withings",
      success: "true",
      error: undefined,
    });

    render(<Link />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Connection Successful",
        description: "Successfully connected Withings account!",
        variant: "success",
      });
    });
  });

  it("should show error toast for Fitbit connection failure", async () => {
    mockUseSearch.mockReturnValue({
      provider: "fitbit",
      success: undefined,
      error: "true",
    });

    render(<Link />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Connection Failed",
        description: "Failed to connect Fitbit account. Please try again.",
        variant: "error",
      });
    });
  });

  it("should show error toast for Withings connection failure", async () => {
    mockUseSearch.mockReturnValue({
      provider: "withings",
      success: undefined,
      error: "true",
    });

    render(<Link />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Connection Failed",
        description: "Failed to connect Withings account. Please try again.",
        variant: "error",
      });
    });
  });

  it("should not show toast when no success or error params", () => {
    mockUseSearch.mockReturnValue({
      provider: "fitbit",
      success: undefined,
      error: undefined,
    });

    render(<Link />);

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("should not show toast when provider is missing", () => {
    mockUseSearch.mockReturnValue({
      provider: undefined,
      success: "true",
      error: undefined,
    });

    render(<Link />);

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("should only show one toast when both success and error are present", async () => {
    // Success takes precedence over error
    mockUseSearch.mockReturnValue({
      provider: "fitbit",
      success: "true",
      error: "true",
    });

    render(<Link />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Connection Successful",
        description: "Successfully connected Fitbit account!",
        variant: "success",
      });
    });
  });

  it("should handle unknown provider names gracefully", async () => {
    mockUseSearch.mockReturnValue({
      provider: "unknown",
      success: "true",
      error: undefined,
    });

    render(<Link />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Connection Successful",
        description: "Successfully connected Withings account!", // Defaults to Withings for unknown
        variant: "success",
      });
    });
  });

  it("should only call showToast once per render", async () => {
    const { rerender } = render(<Link />);

    mockUseSearch.mockReturnValue({
      provider: "fitbit",
      success: "true",
      error: undefined,
    });

    rerender(<Link />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });
  });

  it("should update toast when query params change", async () => {
    const { rerender } = render(<Link />);

    // First render with success
    mockUseSearch.mockReturnValue({
      provider: "fitbit",
      success: "true",
      error: undefined,
    });

    rerender(<Link />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    // Change to error
    mockUseSearch.mockReturnValue({
      provider: "fitbit",
      success: undefined,
      error: "true",
    });

    rerender(<Link />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledTimes(2);
      expect(mockShowToast).toHaveBeenLastCalledWith({
        title: "Connection Failed",
        description: "Failed to connect Fitbit account. Please try again.",
        variant: "error",
      });
    });
  });
});
