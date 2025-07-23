import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OAuthCallbackUI } from "./OAuthCallbackUI";
import { useNavigate } from "@tanstack/react-router";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
}));

// Mock Layout component
vi.mock("../Layout", () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

describe("OAuthCallbackUI", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  describe("loading state", () => {
    it("should show loading message", () => {
      render(<OAuthCallbackUI providerName="Withings" state="loading" />);

      expect(screen.getByText("Connecting to Withings...")).toBeInTheDocument();
    });

    it("should show retry count when provided", () => {
      render(<OAuthCallbackUI providerName="Fitbit" state="loading" retryCount={1} maxRetries={3} />);

      expect(screen.getByText("Connecting to Fitbit...")).toBeInTheDocument();
      expect(screen.getByText("(Retry 1/3)")).toBeInTheDocument();
    });

    it("should not show retry count when retryCount is 0", () => {
      render(<OAuthCallbackUI providerName="Fitbit" state="loading" retryCount={0} maxRetries={3} />);

      expect(screen.getByText("Connecting to Fitbit...")).toBeInTheDocument();
      expect(screen.queryByText(/Retry/)).not.toBeInTheDocument();
    });
  });

  describe("success state", () => {
    it("should show success message with checkmark", () => {
      render(<OAuthCallbackUI providerName="Withings" state="success" />);

      expect(screen.getByText("Connected!")).toBeInTheDocument();
      expect(screen.getByText("Taking you to your dashboard...")).toBeInTheDocument();

      // Check for checkmark icon (FaCheck)
      const icon = document.querySelector(".text-green-600");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("error state", () => {
    it("should show error message", () => {
      render(<OAuthCallbackUI providerName="Withings" state="error" error="Failed to connect to Withings. Please try again." />);

      expect(screen.getByText("Connection failed")).toBeInTheDocument();
      expect(screen.getByText("Failed to connect to Withings. Please try again.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    });

    it("should show rate limit message when error code is RATE_LIMITED", () => {
      render(<OAuthCallbackUI providerName="Fitbit" state="error" error="Too many attempts" errorCode="RATE_LIMITED" />);

      expect(screen.getByText("Connection failed")).toBeInTheDocument();
      expect(screen.getByText("Too many attempts")).toBeInTheDocument();
      expect(screen.getByText(/If you've made multiple connection attempts/)).toBeInTheDocument();
    });

    it("should navigate to link page when Try Again is clicked", async () => {
      const user = userEvent.setup();

      render(<OAuthCallbackUI providerName="Withings" state="error" error="Connection failed" />);

      await user.click(screen.getByRole("button", { name: "Try Again" }));

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/link" });
    });

    it("should not show error UI when state is error but no error message", () => {
      render(<OAuthCallbackUI providerName="Withings" state="error" />);

      // Should show invalid state instead
      expect(screen.queryByText("Connection failed")).not.toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });

  describe("invalid state", () => {
    it("should show generic error for invalid state", () => {
      render(<OAuthCallbackUI providerName="Withings" state="invalid" />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Let's try connecting your Withings account again.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Connect Account" })).toBeInTheDocument();
    });

    it("should navigate to link page when Connect Account is clicked", async () => {
      const user = userEvent.setup();

      render(<OAuthCallbackUI providerName="Fitbit" state="invalid" />);

      await user.click(screen.getByRole("button", { name: "Connect Account" }));

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/link" });
    });
  });

  describe("provider name variations", () => {
    it("should display correct provider name in messages", () => {
      const { rerender } = render(<OAuthCallbackUI providerName="Apple Health" state="loading" />);
      expect(screen.getByText("Connecting to Apple Health...")).toBeInTheDocument();

      rerender(<OAuthCallbackUI providerName="Google Fit" state="invalid" />);
      expect(screen.getByText("Let's try connecting your Google Fit account again.")).toBeInTheDocument();
    });
  });
});
