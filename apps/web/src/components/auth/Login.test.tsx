import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "./Login";

// Mock dependencies
const mockNavigate = vi.fn();
const mockSearch = { from: undefined as string | undefined };

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../routes/login", () => ({
  Route: {
    useSearch: () => mockSearch,
  },
}));

// Mock auth functions
const mockSignInWithGoogle = vi.fn();
const mockSignInWithMicrosoft = vi.fn();
const mockSignInWithApple = vi.fn();

vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({
    signInWithGoogle: mockSignInWithGoogle,
    signInWithMicrosoft: mockSignInWithMicrosoft,
    signInWithApple: mockSignInWithApple,
  }),
}));

// Mock components
vi.mock("../ui/Heading", () => ({
  Heading: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
}));

vi.mock("../ui/Button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className, type }: any) => (
    <button onClick={onClick} disabled={disabled} className={`${variant} ${size} ${className}`} type={type}>
      {children}
    </button>
  ),
}));

vi.mock("./SocialLoginButtons", () => ({
  SocialLoginButtons: ({ onSocialLogin }: any) => (
    <div data-testid="social-login-buttons">
      <button onClick={() => onSocialLogin("google")}>Sign in with Google</button>
      <button onClick={() => onSocialLogin("microsoft")}>Sign in with Microsoft</button>
      <button onClick={() => onSocialLogin("apple")}>Sign in with Apple</button>
    </div>
  ),
}));

vi.mock("./OtpLogin", () => ({
  OtpLogin: ({ onBack }: { onBack: () => void }) => (
    <div data-testid="otp-login-form">
      <button onClick={onBack}>Back to login options</button>
      <form data-testid="email-login-form">
        <input type="email" data-testid="email-input" />
        <button type="submit">Continue</button>
      </form>
    </div>
  ),
}));

vi.mock("./AuthDivider", () => ({
  AuthDivider: () => <div>or</div>,
}));

vi.mock("./AuthError", () => ({
  AuthError: ({ error }: any) => <div role="alert">{error}</div>,
}));

vi.mock("./PrivacyPolicyLink", () => ({
  PrivacyPolicyLink: () => <div>Privacy Policy Link</div>,
}));

vi.mock("../../lib/auth/useAppleSignIn", () => ({
  useAppleSignIn: () => {},
}));

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.from = undefined;
    sessionStorage.clear();
    import.meta.env.VITE_TURNSTILE_SITE_KEY = "";
  });

  it("should render welcome message and social login buttons", () => {
    render(<Login />);

    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Log in to your account or create a new one")).toBeInTheDocument();
    expect(screen.getByTestId("social-login-buttons")).toBeInTheDocument();
    expect(screen.getByText("Continue with Email")).toBeInTheDocument();
    expect(screen.getByText("Privacy Policy Link")).toBeInTheDocument();
  });

  it("should show email form when email button is clicked", async () => {
    const user = userEvent.setup();
    render(<Login />);

    const emailButton = screen.getByText("Continue with Email");
    await user.click(emailButton);

    expect(screen.getByTestId("email-login-form")).toBeInTheDocument();
    expect(screen.queryByText("Welcome")).not.toBeInTheDocument(); // Welcome header should not be shown
  });

  it("should hide email form when back button is clicked", async () => {
    const user = userEvent.setup();
    render(<Login />);

    // Show email form
    await user.click(screen.getByText("Continue with Email"));
    expect(screen.getByTestId("email-login-form")).toBeInTheDocument();

    // Go back
    await user.click(screen.getByText("Back to login options"));
    expect(screen.queryByTestId("email-login-form")).not.toBeInTheDocument();
    expect(screen.getByTestId("social-login-buttons")).toBeInTheDocument();
  });

  it("should handle Google sign in", async () => {
    const user = userEvent.setup();
    mockSignInWithGoogle.mockResolvedValue(undefined);

    render(<Login />);

    const googleButton = screen.getByText("Sign in with Google");
    await user.click(googleButton);

    expect(mockSignInWithGoogle).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("should handle Microsoft sign in", async () => {
    const user = userEvent.setup();
    mockSignInWithMicrosoft.mockResolvedValue(undefined);

    render(<Login />);

    const microsoftButton = screen.getByText("Sign in with Microsoft");
    await user.click(microsoftButton);

    expect(mockSignInWithMicrosoft).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" });
    });
  });

  it("should handle Apple sign in", async () => {
    const user = userEvent.setup();
    mockSignInWithApple.mockResolvedValue(undefined);

    render(<Login />);

    const appleButton = screen.getByText("Sign in with Apple");
    await user.click(appleButton);

    expect(mockSignInWithApple).toHaveBeenCalled();
    // Apple redirects to Apple's site, so no navigation happens
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should store redirect location for Apple sign in", async () => {
    const user = userEvent.setup();
    mockSearch.from = "/settings";
    mockSignInWithApple.mockResolvedValue(undefined);

    render(<Login />);

    const appleButton = screen.getByText("Sign in with Apple");
    await user.click(appleButton);

    expect(sessionStorage.getItem("apple_auth_redirect")).toBe("/settings");
  });

  it("should handle social login errors", async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    mockSignInWithGoogle.mockRejectedValue(new Error("Auth failed"));

    render(<Login />);

    const googleButton = screen.getByText("Sign in with Google");
    await user.click(googleButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Failed to sign in with google. Please try again.");
    });

    consoleErrorSpy.mockRestore();
  });

  it("should navigate to custom redirect after successful login", async () => {
    const user = userEvent.setup();
    mockSearch.from = "/settings";
    mockSignInWithGoogle.mockResolvedValue(undefined);

    render(<Login />);

    const googleButton = screen.getByText("Sign in with Google");
    await user.click(googleButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/settings" });
    });
  });

  it("should clear form state when toggling between views", async () => {
    const user = userEvent.setup();
    render(<Login />);

    // Show email form and type
    await user.click(screen.getByText("Continue with Email"));
    const emailInput = screen.getByTestId("email-input");
    await user.type(emailInput, "test@example.com");

    // Go back
    await user.click(screen.getByText("Back to login options"));

    // Show email form again
    await user.click(screen.getByText("Continue with Email"));

    // Email should be cleared
    const newEmailInput = screen.getByTestId("email-input");
    expect(newEmailInput).toHaveValue("");
  });
});
