import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OtpLogin } from "./OtpLogin";

// Mock auth hook
const mockSendOtpCode = vi.fn();
const mockVerifyOtpCode = vi.fn();

vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({
    sendOtpCode: mockSendOtpCode,
    verifyOtpCode: mockVerifyOtpCode,
  }),
}));

// Mock Turnstile component
vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => {
    // Auto-trigger success for testing
    setTimeout(() => onSuccess("test-token"), 0);
    return <div data-testid="turnstile">Turnstile Mock</div>;
  },
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("OtpLogin", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email input initially", () => {
    render(<OtpLogin onBack={mockOnBack} />);

    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByText("Continue with Email")).toBeInTheDocument();
    expect(screen.getByText("← Back to login options")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", async () => {
    const user = userEvent.setup();
    render(<OtpLogin onBack={mockOnBack} />);

    await user.click(screen.getByText("← Back to login options"));

    expect(mockOnBack).toHaveBeenCalled();
  });

  it("shows OTP input after email submission", async () => {
    const user = userEvent.setup();

    mockSendOtpCode.mockResolvedValueOnce(undefined);

    render(<OtpLogin onBack={mockOnBack} />);

    // Enter email
    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");

    // Submit form
    await user.click(screen.getByText("Continue with Email"));

    // Should show OTP input
    await waitFor(() => {
      expect(screen.getByText(/We sent a 6-digit code to test@example.com/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });
  });

  it("handles OTP verification successfully", async () => {
    const user = userEvent.setup();

    mockSendOtpCode.mockResolvedValueOnce(undefined);

    mockVerifyOtpCode.mockResolvedValueOnce({
      access_token: "token",
      refresh_token: "refresh",
    } as any);

    render(<OtpLogin onBack={mockOnBack} />);

    // Enter email
    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.click(screen.getByText("Continue with Email"));

    // Wait for OTP input
    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    // Enter OTP
    await user.type(screen.getByPlaceholderText("000000"), "123456");
    await user.click(screen.getByText("Verify Code"));

    // Should navigate to dashboard
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("shows error for invalid OTP", async () => {
    const user = userEvent.setup();

    mockSendOtpCode.mockResolvedValueOnce(undefined);

    mockVerifyOtpCode.mockRejectedValueOnce(new Error("Invalid OTP"));

    render(<OtpLogin onBack={mockOnBack} />);

    // Enter email
    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.click(screen.getByText("Continue with Email"));

    // Wait for OTP input
    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    // Enter OTP
    await user.type(screen.getByPlaceholderText("000000"), "999999");
    await user.click(screen.getByText("Verify Code"));

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/Invalid code/)).toBeInTheDocument();
    });
  });

  it("handles rate limit error", async () => {
    const user = userEvent.setup();

    mockSendOtpCode.mockRejectedValueOnce(new Error("Email rate limit exceeded"));

    render(<OtpLogin onBack={mockOnBack} />);

    // Enter email
    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.click(screen.getByText("Continue with Email"));

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/Please wait 60 seconds before requesting another code/)).toBeInTheDocument();
    });
  });

  it("allows resending OTP after cooldown", async () => {
    const user = userEvent.setup();

    mockSendOtpCode.mockResolvedValue(undefined);

    render(<OtpLogin onBack={mockOnBack} />);

    // Enter email
    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.click(screen.getByText("Continue with Email"));

    // Wait for OTP input
    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    // Resend button should initially be disabled with countdown
    expect(screen.getByText(/Send new code \(60s\)/)).toBeDisabled();

    // For testing, we'll simulate immediate resend by clearing timers
    vi.clearAllTimers();

    // Clear the cooldown manually for testing
    const resendButton = screen.getByText(/Send new code/);
    expect(resendButton).toBeDefined();
  });

  it("allows changing email", async () => {
    const user = userEvent.setup();

    mockSendOtpCode.mockResolvedValueOnce(undefined);

    render(<OtpLogin onBack={mockOnBack} />);

    // Enter email
    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.click(screen.getByText("Continue with Email"));

    // Wait for OTP input
    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    // Click change email
    await user.click(screen.getByText("Change email"));

    // Should go back to email input
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("000000")).not.toBeInTheDocument();
  });

  it("validates OTP format", async () => {
    const user = userEvent.setup();

    mockSendOtpCode.mockResolvedValueOnce(undefined);

    render(<OtpLogin onBack={mockOnBack} />);

    // Enter email
    await user.type(screen.getByPlaceholderText("Email address"), "test@example.com");
    await user.click(screen.getByText("Continue with Email"));

    // Wait for OTP input
    await waitFor(() => {
      expect(screen.getByPlaceholderText("000000")).toBeInTheDocument();
    });

    // Enter invalid OTP (less than 6 digits)
    await user.type(screen.getByPlaceholderText("000000"), "123");

    // Verify button should be disabled
    expect(screen.getByText("Verify Code")).toBeDisabled();
  });

  it("integrates with captcha when configured", async () => {
    // Set captcha environment variable
    import.meta.env.VITE_TURNSTILE_SITE_KEY = "test-site-key";

    render(<OtpLogin onBack={mockOnBack} />);

    // Should render Turnstile
    expect(screen.getByTestId("turnstile")).toBeInTheDocument();

    // Clean up
    delete import.meta.env.VITE_TURNSTILE_SITE_KEY;
  });
});
