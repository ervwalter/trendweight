import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderList } from "./ProviderList";
import { useProviderLinks } from "../../lib/api/queries";
import { useDisconnectProvider, useResyncProvider } from "../../lib/api/mutations";
import { apiRequest } from "../../lib/api/client";
import { useToast } from "../../lib/hooks/useToast";

// Mock dependencies
vi.mock("../../lib/api/queries");
vi.mock("../../lib/api/mutations");
vi.mock("../../lib/api/client");
vi.mock("../../lib/hooks/useToast");

// Mock ConfirmDialog
vi.mock("../ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, onConfirm, title, description, confirmText }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <div>{title}</div>
        <div>{description}</div>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    ) : null,
}));

describe("ProviderList", () => {
  const mockShowToast = vi.fn();
  const mockDisconnectMutate = vi.fn();
  const mockResyncMutate = vi.fn();

  const mockProviderLinks = [
    {
      provider: "withings",
      connectedAt: "2024-01-15T10:00:00Z",
      userId: "123",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

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
    vi.mocked(useResyncProvider).mockReturnValue({
      mutate: mockResyncMutate,
      isPending: false,
      variables: undefined,
    } as any);
  });

  describe("link variant", () => {
    it("should render header when showHeader is true", () => {
      render(<ProviderList variant="link" showHeader={true} />);

      expect(screen.getByText("Connect Your Scale")).toBeInTheDocument();
      expect(screen.getByText(/Connect your Withings or Fitbit account/)).toBeInTheDocument();
      expect(screen.getByText("Don't have a smart scale?")).toBeInTheDocument();
    });

    it("should not render header when showHeader is false", () => {
      render(<ProviderList variant="link" showHeader={false} />);

      expect(screen.queryByText("Connect Your Scale")).not.toBeInTheDocument();
    });

    it("should render provider cards with full layout", () => {
      render(<ProviderList variant="link" />);

      expect(screen.getByText("Withings Account")).toBeInTheDocument();
      expect(screen.getByText("Fitbit Account")).toBeInTheDocument();

      // Check descriptions
      expect(screen.getByText(/Withings creates beautifully designed/)).toBeInTheDocument();
      expect(screen.getByText(/Fitbit's ecosystem helps you stay motivated/)).toBeInTheDocument();
    });

    it("should show connected state for connected providers", () => {
      render(<ProviderList variant="link" />);

      // Withings is connected
      expect(screen.getByText("Resync Data")).toBeInTheDocument();
      expect(screen.getByText("Disconnect")).toBeInTheDocument();

      // Check for checkmark icon
      const checkIcon = document.querySelector(".text-green-600");
      expect(checkIcon).toBeInTheDocument();
    });

    it("should show connect button for unconnected providers", () => {
      render(<ProviderList variant="link" />);

      // Fitbit is not connected
      expect(screen.getByText("Connect Fitbit Account")).toBeInTheDocument();
    });

    it("should handle connect action", async () => {
      const user = userEvent.setup();
      vi.mocked(apiRequest).mockResolvedValue({ authorizationUrl: "https://fitbit.com/auth" });

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Connect Fitbit Account"));

      expect(apiRequest).toHaveBeenCalledWith("/fitbit/link");
      expect(window.location.assign).toHaveBeenCalledWith("https://fitbit.com/auth");
    });

    it("should handle connect error", async () => {
      // Suppress expected console.error for this test
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const user = userEvent.setup();
      vi.mocked(apiRequest).mockRejectedValue(new Error("Network error"));

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Connect Fitbit Account"));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          title: "Connection Failed",
          description: "Failed to connect to fitbit. Please try again.",
          variant: "error",
        });
      });

      consoleErrorSpy.mockRestore();
    });

    it("should handle resync action", async () => {
      const user = userEvent.setup();

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Resync Data"));

      expect(mockResyncMutate).toHaveBeenCalledWith(
        "withings",
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );

      // Simulate success callback
      const successCallback = mockResyncMutate.mock.calls[0][1].onSuccess;
      successCallback();

      expect(mockShowToast).toHaveBeenCalledWith({
        title: "Resync Complete",
        description: "Withings data has been resynced successfully.",
        variant: "success",
      });
    });

    it("should show resync pending state", () => {
      vi.mocked(useResyncProvider).mockReturnValue({
        mutate: mockResyncMutate,
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

    it("should render external links with proper attributes", () => {
      render(<ProviderList variant="link" />);

      const withingsLink = screen.getByText("Get a Withings scale");
      expect(withingsLink).toHaveAttribute("href", "https://www.withings.com/us/en/scales");
      expect(withingsLink).toHaveAttribute("target", "_blank");
      expect(withingsLink).toHaveAttribute("rel", "noopener noreferrer");

      const fitbitLink = screen.getByText("Get a Fitbit Aria scale");
      expect(fitbitLink).toHaveAttribute("href", "https://www.fitbit.com/global/us/products/scales");
    });
  });

  describe("settings variant", () => {
    it("should render compact layout for settings", () => {
      render(<ProviderList variant="settings" />);

      // Should not show descriptions
      expect(screen.queryByText(/Withings creates beautifully designed/)).not.toBeInTheDocument();

      // Should show provider names
      expect(screen.getByText("Withings")).toBeInTheDocument();
      expect(screen.getByText("Fitbit")).toBeInTheDocument();
    });

    it("should show connection date for connected providers", () => {
      render(<ProviderList variant="settings" />);

      expect(screen.getByText(/Connected 1\/15\/2024/)).toBeInTheDocument();
      expect(screen.getByText("Not connected")).toBeInTheDocument();
    });

    it("should handle withings connection", async () => {
      const user = userEvent.setup();
      vi.mocked(apiRequest).mockResolvedValue({ url: "https://withings.com/auth" });

      vi.mocked(useProviderLinks).mockReturnValue({ data: [] } as any);
      render(<ProviderList variant="settings" />);

      const connectButtons = screen.getAllByText("Connect");
      await user.click(connectButtons[0]); // First is Withings

      expect(apiRequest).toHaveBeenCalledWith("/withings/link");
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
    it("should handle resync error", async () => {
      const user = userEvent.setup();

      render(<ProviderList variant="link" />);

      await user.click(screen.getByText("Resync Data"));

      // Simulate error callback
      const errorCallback = mockResyncMutate.mock.calls[0][1].onError;
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
      vi.mocked(useResyncProvider).mockReturnValue({
        mutate: mockResyncMutate,
        isPending: true,
        variables: "withings",
      } as any);

      render(<ProviderList variant="settings" />);

      const resyncButton = screen.getByText("Syncing...");
      expect(resyncButton.closest("button")).toBeDisabled();
    });
  });
});
