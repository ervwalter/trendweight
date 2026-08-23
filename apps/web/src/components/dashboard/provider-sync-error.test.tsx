import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import ProviderSyncError from "./provider-sync-error";
import type { ProviderSyncStatus } from "@/lib/api/types";

// Mock the mutations
vi.mock("@/lib/api/mutations", () => ({
  useReconnectProvider: vi.fn(),
}));

// Mock router Link (used by the shutdown notice)
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

const mockUseReconnectProvider = vi.mocked(await import("@/lib/api/mutations")).useReconnectProvider;

// Mock window.location.assign
const mockLocationAssign = vi.fn();
Object.defineProperty(window, "location", {
  value: { assign: mockLocationAssign },
  writable: true,
});

describe("ProviderSyncError", () => {
  const mockMutateAsync = vi.fn();
  const mockReconnectProvider = {
    mutateAsync: mockMutateAsync,
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockUseReconnectProvider.mockReturnValue(mockReconnectProvider as any);
  });

  it("should return null when status is successful", () => {
    const status: ProviderSyncStatus = { success: true };
    const { container } = render(<ProviderSyncError provider="fitbit" status={status} />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null when there is no error", () => {
    const status: ProviderSyncStatus = { success: false };
    const { container } = render(<ProviderSyncError provider="fitbit" status={status} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render authfailed error for Fitbit", () => {
    const status: ProviderSyncStatus = { success: false, error: "authfailed" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    expect(screen.getByText("Fitbit connection needs to be refreshed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconnect →" })).toBeInTheDocument();
  });

  it("should render authfailed error for Withings", () => {
    const status: ProviderSyncStatus = { success: false, error: "authfailed" };
    render(<ProviderSyncError provider="withings" status={status} />);

    expect(screen.getByText("Withings connection needs to be refreshed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconnect →" })).toBeInTheDocument();
  });

  it("should render network error with different button text", () => {
    const status: ProviderSyncStatus = { success: false, error: "networkerror" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    expect(screen.getByText(/Unable to connect to Fitbit/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try reconnecting →" })).toBeInTheDocument();
  });

  it("should render custom error message when provided", () => {
    const status: ProviderSyncStatus = { success: false, error: "unknown", message: "Custom error message" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try reconnecting →" })).toBeInTheDocument();
  });

  it("should render default error message for unknown error types", () => {
    const status: ProviderSyncStatus = { success: false, error: "unknown" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    expect(screen.getByText(/Fitbit sync failed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try reconnecting →" })).toBeInTheDocument();
  });

  it("should render a dismissible shutdown notice without a reconnect button for disabled providers", async () => {
    const user = userEvent.setup();
    const status: ProviderSyncStatus = { success: false, error: "disabled" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    expect(screen.getByText(/Fitbit syncing has ended/)).toBeInTheDocument();
    expect(screen.getByText(/history is preserved/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reconnect/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /read more about what's happening/i })).toHaveAttribute(
      "href",
      "https://ewal.dev/fitbit-google-health-and-whats-next",
    );
    expect(screen.getByRole("link", { name: "weight log" })).toHaveAttribute("href", "/log");
    expect(screen.getByText(/use the × to dismiss this message for good/i)).toBeInTheDocument();

    // Dismiss persists
    await user.click(screen.getByRole("button", { name: "Dismiss notice" }));
    expect(screen.queryByText(/Fitbit syncing has ended/)).not.toBeInTheDocument();
    expect(window.localStorage.getItem("providerShutdownNoticeDismissed-fitbit")).toBe("true");
  });

  it("should not render the shutdown notice after the auto-hide cutoff date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-03-01"));

    const status: ProviderSyncStatus = { success: false, error: "disabled" };
    const { container } = render(<ProviderSyncError provider="fitbit" status={status} />);

    expect(container.firstChild).toBeNull();
    vi.useRealTimers();
  });

  it("should not render the shutdown notice when previously dismissed", () => {
    window.localStorage.setItem("providerShutdownNoticeDismissed-fitbit", "true");

    const status: ProviderSyncStatus = { success: false, error: "disabled" };
    const { container } = render(<ProviderSyncError provider="fitbit" status={status} />);

    expect(container.firstChild).toBeNull();
  });

  it("should disable button when mutation is pending", () => {
    mockUseReconnectProvider.mockReturnValue({
      ...mockReconnectProvider,
      isPending: true,
    } as any);

    const status: ProviderSyncStatus = { success: false, error: "authfailed" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Loading...");
  });

  it("should call reconnectProvider mutation when button is clicked", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({ url: "https://auth.example.com" });

    const status: ProviderSyncStatus = { success: false, error: "authfailed" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    await user.click(screen.getByRole("button", { name: "Reconnect →" }));

    expect(mockMutateAsync).toHaveBeenCalledWith("fitbit");
  });

  it("should redirect to auth URL after successful mutation (url field)", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({ url: "https://auth.example.com" });

    const status: ProviderSyncStatus = { success: false, error: "authfailed" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    await user.click(screen.getByRole("button", { name: "Reconnect →" }));

    expect(mockLocationAssign).toHaveBeenCalledWith("https://auth.example.com");
  });

  it("should redirect to auth URL after successful mutation (authorizationUrl field)", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({ authorizationUrl: "https://auth2.example.com" });

    const status: ProviderSyncStatus = { success: false, error: "authfailed" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    await user.click(screen.getByRole("button", { name: "Reconnect →" }));

    expect(mockLocationAssign).toHaveBeenCalledWith("https://auth2.example.com");
  });

  it("should handle mutation errors gracefully", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockMutateAsync.mockRejectedValue(new Error("Network error"));

    const status: ProviderSyncStatus = { success: false, error: "authfailed" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    await user.click(screen.getByRole("button", { name: "Reconnect →" }));

    expect(consoleError).toHaveBeenCalledWith("Error initiating fitbit reconnection:", expect.any(Error));
    consoleError.mockRestore();
  });

  it("should not redirect when no auth URL is provided", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({});

    const status: ProviderSyncStatus = { success: false, error: "authfailed" };
    render(<ProviderSyncError provider="fitbit" status={status} />);

    await user.click(screen.getByRole("button", { name: "Reconnect →" }));

    expect(mockLocationAssign).not.toHaveBeenCalled();
  });
});
