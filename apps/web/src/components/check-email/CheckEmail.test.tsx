import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CheckEmail } from "./CheckEmail";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, className }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

// Mock auth hook
const mockSendLoginEmail = vi.fn();
vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({
    sendLoginEmail: mockSendLoginEmail,
  }),
}));

// Mock UI components
vi.mock("../ui/Heading", () => ({
  Heading: ({ children }: any) => <h1>{children}</h1>,
}));

vi.mock("../ui/Button", () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={`${variant} ${className}`}>
      {children}
    </button>
  ),
}));

// Mock react-icons
vi.mock("react-icons/hi", () => ({
  HiOutlineMail: () => <div data-testid="mail-icon">Mail Icon</div>,
}));

describe("CheckEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset window.location
    delete (window as any).location;
    (window as any).location = {
      search: "",
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should render check email message", () => {
    render(<CheckEmail />);

    expect(screen.getByText("Check your email!")).toBeInTheDocument();
    expect(screen.getByText("We sent a login link to")).toBeInTheDocument();
    expect(screen.getByText("your email address")).toBeInTheDocument();
    expect(screen.getByText("Open the link in your email to continue. This link will expire in 1 hour.")).toBeInTheDocument();
  });

  it("should display email from URL params", () => {
    window.location.search = "?email=test@example.com";

    render(<CheckEmail />);

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("should show countdown timer", () => {
    render(<CheckEmail />);

    expect(screen.getByText("Didn't get it? You can request a new link in 30 seconds")).toBeInTheDocument();
  });

  it("should decrement countdown timer", () => {
    render(<CheckEmail />);

    expect(screen.getByText("Didn't get it? You can request a new link in 30 seconds")).toBeInTheDocument();

    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText("Didn't get it? You can request a new link in 25 seconds")).toBeInTheDocument();
  });

  it("should show resend button after countdown", () => {
    render(<CheckEmail />);

    // Advance timer by 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.queryByText(/You can request a new link in/)).not.toBeInTheDocument();
    expect(screen.getByText("Send again")).toBeInTheDocument();
  });

  it("should handle resend button click", async () => {
    window.location.search = "?email=test@example.com";
    mockSendLoginEmail.mockResolvedValue(undefined);

    render(<CheckEmail />);

    // Advance timer to enable resend
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    const resendButton = screen.getByText("Send again");

    await act(async () => {
      fireEvent.click(resendButton);
    });

    expect(mockSendLoginEmail).toHaveBeenCalledWith("test@example.com");
  });

  it("should not resend if no email", () => {
    // No email in URL params
    render(<CheckEmail />);

    // Advance timer to enable resend
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    const resendButton = screen.getByText("Send again");
    fireEvent.click(resendButton);

    expect(mockSendLoginEmail).not.toHaveBeenCalled();
  });

  it("should disable button while sending", async () => {
    window.location.search = "?email=test@example.com";
    mockSendLoginEmail.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<CheckEmail />);

    // Advance timer to enable resend
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    const resendButton = screen.getByText("Send again");

    await act(async () => {
      fireEvent.click(resendButton);
    });

    expect(resendButton).toBeDisabled();
    expect(resendButton).toHaveTextContent("Sending...");
  });

  it("should show try again link", () => {
    render(<CheckEmail />);

    const tryAgainLink = screen.getByText("Try again");
    expect(tryAgainLink).toHaveAttribute("href", "/login");
  });

  it("should clear timer on unmount", () => {
    const { unmount } = render(<CheckEmail />);

    // Create spy for clearInterval
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it("should handle rapid countdown to zero", () => {
    render(<CheckEmail />);

    // Advance timer to 29 seconds
    act(() => {
      vi.advanceTimersByTime(29000);
    });

    expect(screen.getByText("Didn't get it? You can request a new link in 1 seconds")).toBeInTheDocument();

    // Advance one more second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("Send again")).toBeInTheDocument();
  });
});
