import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderList } from "./provider-list";
import { useProviderLinks } from "@/lib/api/queries";
import { useDisconnectProvider, useClearProviderData, useEnableProvider } from "@/lib/api/mutations";
import { apiRequest } from "@/lib/api/client";
import { useToast } from "@/lib/hooks/use-toast";
import { useAuth } from "@/lib/auth/use-auth";

// Mock dependencies
vi.mock("@/lib/api/queries");
vi.mock("@/lib/api/mutations");
vi.mock("@/lib/api/client");
vi.mock("@/lib/hooks/use-toast");
vi.mock("@/lib/auth/use-auth");

// Mock ConfirmDialog
vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, onConfirm, title, description, confirmText }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <div>{title}</div>
        <div>{description}</div>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    ) : null,
}));

// Mock useNavigate and Link
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("ProviderList", () => {
  const mockShowToast = vi.fn();
  const mockDisconnectMutate = vi.fn();
  const mockClearDataMutate = vi.fn();
  const mockEnableMutate = vi.fn();

  const mockProviderLinks = [
    {
      provider: "withings",
      connectedAt: "2024-01-15T10:00:00Z",
      userId: "123",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();

    // Spy on window.location.assign
    Object.defineProperty(window, "location", {
      value: { assign: vi.fn() },
      writable: true,
    });

    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast } as any);
    vi.mocked(useProviderLinks).mockReturnValue({ data: mockProviderLinks } as any);
    vi.mocked(useDisconnectProvider).mockReturnValue({
      mutate: mockDisconnectMutate,
      isPending: false,
      variables: undefined,
    } as any);
    vi.mocked(useClearProviderData).mockReturnValue({
      mutate: mockClearDataMutate,
      isPending: false,
      variables: undefined,
    } as any);
    vi.mocked(useEnableProvider).mockReturnValue({
      mutate: mockEnableMutate,
      isPending: false,
      variables: undefined,
    } as any);
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "test-user", email: "test@example.com", displayName: "Test User" },
      isLoaded: true,
      isLoggedIn: true,
      signOut: vi.fn(),
      getToken: vi.fn().mockResolvedValue("mock-token"),
    } as any);
  });

  describe("link variant", () => {
    it("should render header when showHeader is true", () => {
      render(<ProviderList variant="link" showHeader={true} />);

      expect(screen.getByText("Connect Your Scale")).toBeInTheDocument();
      expect(screen.getByText(/Connect your Withings account/)).toBeInTheDocument();
    });

    it("should render manual entry as a first-class option", () => {
      render(<ProviderList variant="link" />);

      expect(screen.getByText("Log It Yourself")).toBeInTheDocument();
      expect(screen.getByText(/Type in your weight/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Log Your Weight" })).toHaveAttribute("href", "/log");
    });

    it("should not render header when showHeader is false", () => {
      render(<ProviderList variant="link" showHeader={false} />);

      expect(screen.queryByText("Connect Your Scale")).not.toBeInTheDocument();
    });

    it("should render provider cards with full layout", () => {
      render(<ProviderList variant="link" />);

      expect(screen.getByText("Withings Account")).toBeInTheDocument();
      expect(screen.getByText(/Withings creates beautifully designed/)).toBeInTheDocument();
    });

    it("should offer Fitbit with a connect button and a sunset heads-up when not connected", () => {
      render(<ProviderList variant="link" />);

      expect(screen.getByText("Fitbit Account")).toBeInTheDocument();
      expect(screen.getByText("Connect Fitbit Account")).toBeInTheDocument();
      expect(screen.getByText(/expected to stop in September 2026/i)).toBeInTheDocument();
    });

    it("should show a connected Fitbit with the sunset explanation and no connect button", () => {
      vi.mocked(useProviderLinks).mockReturnValue({
        data: [...mockProviderLinks, { provider: "fitbit", connectedAt: "2024-02-01T10:00:00Z", userId: "123" }],
      } as any);

      render(<ProviderList variant="link" />);

      expect(screen.getByText("Fitbit Account")).toBeInTheDocument();
      expect(screen.getByText(/expected to stop in September 2026/i)).toBeInTheDocument();
      expect(screen.queryByText("Connect Fitbit Account")).not.toBeInTheDocument();
    });

    it("should show connected state for connected providers", () => {
      render(<ProviderList variant="link" />);

      // Withings is connected
      expect(screen.getByText("Resync Data")).toBeInTheDocument();
      expect(screen.getByText("Disconnect")).toBeInTheDocument();

      // Check for checkmark icon
      const checkIcon = document.querySelector(".text-success");
      expect(checkIcon).toBeInTheDocument();
    });

    it("should show connect button for unconnected providers", () => {
      vi.mocked(useProviderLinks).mockReturnValue({ data: [] } as any);
      render(<ProviderList variant="link" />);

      expect(screen.getByText("Connect Withings Account")).toBeInTheDocument();
    });

    it("should handle connect action", async () => {
      const user = userEvent.setup();
      vi.mocked(apiRequest).mockResolvedValue({ authorizationUrl: "https://withings.com/auth" });
      vi.mocked(useProviderLinks).mockReturnValue({ data: [] } as any);

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Connect Withings Account"));

      expect(apiRequest).toHaveBeenCalledWith("/withings/link", { token: "mock-token" });
      expect(window.location.assign).toHaveBeenCalledWith("https://withings.com/auth");
    });

    it("should handle connect error", async () => {
      // Suppress expected console.error for this test
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const user = userEvent.setup();
      vi.mocked(apiRequest).mockRejectedValue(new Error("Network error"));
      vi.mocked(useProviderLinks).mockReturnValue({ data: [] } as any);

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Connect Withings Account"));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: "Connection Failed",
          description: "Failed to connect to withings. Please try again.",
          variant: "error",
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle clear data action", async () => {
      const user = userEvent.setup();

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Resync Data"));

      expect(mockClearDataMutate).toHaveBeenCalledWith(
        "withings",
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );

      // Simulate success callback
      const successCallback = mockClearDataMutate.mock.calls[0][1].onSuccess;
      successCallback();

      // Should navigate to dashboard on success
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });

    it("should show clear data pending state", () => {
      vi.mocked(useClearProviderData).mockReturnValue({
        mutate: mockClearDataMutate,
        isPending: true,
        variables: "withings",
      } as any);

      render(<ProviderList variant="link" />);

      expect(screen.getByText("Syncing...")).toBeInTheDocument();
    });

    it("should show disconnect confirmation dialog", async () => {
      const user = userEvent.setup();

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Disconnect"));

      expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
      expect(screen.getByText("Disconnect Withings?")).toBeInTheDocument();
      expect(screen.getByText("This will remove all weight data from this provider.")).toBeInTheDocument();
    });

    it("should handle disconnect confirmation", async () => {
      const user = userEvent.setup();

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Disconnect"));

      // Click the confirm button in the dialog
      const confirmButton = screen.getByTestId("confirm-dialog").querySelector("button");
      await user.click(confirmButton!);

      expect(mockDisconnectMutate).toHaveBeenCalledWith(
        "withings",
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );

      // Simulate success callback
      await act(async () => {
        const successCallback = mockDisconnectMutate.mock.calls[0][1].onSuccess;
        successCallback();
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Disconnected",
        description: "Withings has been disconnected successfully.",
        variant: "success",
      });
    });

    it("should warn about the Fitbit sunset when disconnecting Fitbit", async () => {
      const user = userEvent.setup();
      vi.mocked(useProviderLinks).mockReturnValue({
        data: [{ provider: "fitbit", connectedAt: "2024-02-01T10:00:00Z", userId: "123" }],
      } as any);

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Disconnect"));

      const dialog = screen.getByTestId("confirm-dialog");
      expect(within(dialog).getByText("Disconnect Fitbit?")).toBeInTheDocument();
      expect(within(dialog).getByText(/you may not be able to reconnect/i)).toBeInTheDocument();
      expect(within(dialog).getByRole("link", { name: /read more about what's happening/i })).toHaveAttribute(
        "href",
        "https://ewal.dev/fitbit-google-health-and-whats-next",
      );
    });

    it("should not show the Fitbit sunset warning when disconnecting Withings", async () => {
      const user = userEvent.setup();

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Disconnect"));

      const dialog = screen.getByTestId("confirm-dialog");
      expect(within(dialog).getByText("Disconnect Withings?")).toBeInTheDocument();
      expect(within(dialog).queryByText(/you may not be able to reconnect/i)).not.toBeInTheDocument();
    });

    it("should render external links with proper attributes", () => {
      render(<ProviderList variant="link" />);

      const withingsLink = screen.getByText("Get a Withings scale");
      expect(withingsLink).toHaveAttribute("href", "https://www.withings.com/us/en/scales");
      expect(withingsLink).toHaveAttribute("target", "_blank");
      expect(withingsLink).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("settings variant", () => {
    it("should render compact layout for settings", () => {
      render(<ProviderList variant="settings" />);

      // Should not show descriptions
      expect(screen.queryByText(/Withings creates beautifully designed/)).not.toBeInTheDocument();

      // Should show both providers; Fitbit remains offerable even when not connected
      expect(screen.getByText("Withings")).toBeInTheDocument();
      expect(screen.getByText("Fitbit")).toBeInTheDocument();
    });

    it("should show connection date for connected providers", () => {
      render(<ProviderList variant="settings" />);

      expect(screen.getByText(/Connected 1\/15\/2024/)).toBeInTheDocument();
    });

    it("should show the sunset note for a connected Fitbit", () => {
      vi.mocked(useProviderLinks).mockReturnValue({
        data: [...mockProviderLinks, { provider: "fitbit", connectedAt: "2024-02-01T10:00:00Z", userId: "123" }],
      } as any);

      render(<ProviderList variant="settings" />);

      expect(screen.getByText("Fitbit")).toBeInTheDocument();
      expect(screen.getByText(/syncing is expected to end in September 2026/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /read more about what's happening/i })).toHaveAttribute(
        "href",
        "https://ewal.dev/fitbit-google-health-and-whats-next",
      );
    });

    it("should show the weight log with an edit link", () => {
      render(<ProviderList variant="settings" />);

      expect(screen.getByText("Weight Log")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/log");
    });

    it("should handle withings connection", async () => {
      const user = userEvent.setup();
      vi.mocked(apiRequest).mockResolvedValue({ url: "https://withings.com/auth" });

      vi.mocked(useProviderLinks).mockReturnValue({ data: [] } as any);
      render(<ProviderList variant="settings" />);

      const connectButtons = screen.getAllByText("Connect");
      await user.click(connectButtons[0]); // First is Withings

      expect(apiRequest).toHaveBeenCalledWith("/withings/link", { token: "mock-token" });
      expect(window.location.assign).toHaveBeenCalledWith("https://withings.com/auth");
    });
  });

  describe("loading state", () => {
    it("should show loading message when data is not available", () => {
      vi.mocked(useProviderLinks).mockReturnValue({ data: undefined } as any);

      render(<ProviderList />);

      expect(screen.getByText("Loading providers...")).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("should handle clear data error", async () => {
      const user = userEvent.setup();

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Resync Data"));

      // Simulate error callback
      const errorCallback = mockClearDataMutate.mock.calls[0][1].onError;
      errorCallback();

      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Resync Failed",
        description: "Failed to resync Withings data. Please try again.",
        variant: "error",
      });
    });

    it("should handle disconnect error", async () => {
      const user = userEvent.setup();

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Disconnect"));

      // Click the confirm button in the dialog
      const confirmButton = screen.getByTestId("confirm-dialog").querySelector("button");
      await user.click(confirmButton!);

      // Simulate error callback
      await act(async () => {
        const errorCallback = mockDisconnectMutate.mock.calls[0][1].onError;
        errorCallback();
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Disconnect Failed",
        description: "Failed to disconnect Withings. Please try again.",
        variant: "error",
      });
    });
  });

  describe("mutation states", () => {
    it("should show disconnect pending state", () => {
      vi.mocked(useDisconnectProvider).mockReturnValue({
        mutate: mockDisconnectMutate,
        isPending: true,
        variables: "withings",
      } as any);

      render(<ProviderList variant="link" />);

      expect(screen.getByText("Disconnecting...")).toBeInTheDocument();
    });

    it("should disable buttons during mutations", () => {
      vi.mocked(useClearProviderData).mockReturnValue({
        mutate: mockClearDataMutate,
        isPending: true,
        variables: "withings",
      } as any);

      render(<ProviderList variant="settings" />);

      const resyncButton = screen.getByText("Syncing...");
      expect(resyncButton.closest("button")).toBeDisabled();
    });
  });
});
