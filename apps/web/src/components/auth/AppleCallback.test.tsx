import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppleCallback } from "./AppleCallback";

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock auth hook
const mockSignInWithAppleToken = vi.fn();
vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({
    signInWithAppleToken: mockSignInWithAppleToken,
  }),
}));

// Mock Heading component
vi.mock("../ui/Heading", () => ({
  Heading: ({ children, className }: any) => <h1 className={className}>{children}</h1>,
}));

describe("AppleCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.location
    delete (window as any).location;
    (window as any).location = {
      href: "http://localhost:3000/apple-callback",
      search: "",
      hash: "",
    };
    // Clear sessionStorage
    sessionStorage.clear();
  });

  it("should show processing state initially", async () => {
    // Provide a valid token so it doesn't immediately error
    window.location.hash = "#id_token=test-token&state=test-state";
    sessionStorage.setItem("apple_auth_state", "test-state");

    // Mock a pending promise to keep it in processing state
    mockSignInWithAppleToken.mockImplementation(() => new Promise(() => {}));

    render(<AppleCallback />);

    expect(screen.getByText("Completing sign in...")).toBeInTheDocument();
    expect(screen.getByText("Please wait while we complete your sign in with Apple.")).toBeInTheDocument();
  });

  it("should handle successful authentication with id_token in hash", async () => {
    window.location.hash = "#id_token=test-token&state=test-state";
    sessionStorage.setItem("apple_auth_state", "test-state");
    sessionStorage.setItem("apple_auth_redirect", "/settings");

    mockSignInWithAppleToken.mockResolvedValue(undefined);

    render(<AppleCallback />);

    await waitFor(() => {
      expect(mockSignInWithAppleToken).toHaveBeenCalledWith("test-token");
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/settings" });
    });

    // Should clean up session storage
    expect(sessionStorage.getItem("apple_auth_state")).toBeNull();
    expect(sessionStorage.getItem("apple_auth_redirect")).toBeNull();
  });

  it("should handle successful authentication with id_token in query params", async () => {
    window.location.search = "?id_token=test-token&state=test-state";
    sessionStorage.setItem("apple_auth_state", "test-state");

    mockSignInWithAppleToken.mockResolvedValue(undefined);

    render(<AppleCallback />);

    await waitFor(() => {
      expect(mockSignInWithAppleToken).toHaveBeenCalledWith("test-token");
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard" }); // Default redirect
    });
  });

  it("should handle error response from Apple", async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    window.location.hash = "#error=user_cancelled";

    render(<AppleCallback />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
      expect(screen.getByText("Apple authentication failed: user_cancelled")).toBeInTheDocument();
      expect(screen.getByText("Back to Log In")).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it("should handle missing id_token", async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    window.location.hash = "#state=test-state";
    sessionStorage.setItem("apple_auth_state", "test-state");

    render(<AppleCallback />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
      expect(screen.getByText("No ID token received from Apple")).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it("should handle CSRF protection - missing state", async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    window.location.hash = "#id_token=test-token&state=test-state";
    // No saved state in sessionStorage

    render(<AppleCallback />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
      expect(screen.getByText("Invalid state parameter - possible CSRF attack")).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it("should handle CSRF protection - mismatched state", async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    window.location.hash = "#id_token=test-token&state=test-state";
    sessionStorage.setItem("apple_auth_state", "different-state");

    render(<AppleCallback />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
      expect(screen.getByText("Invalid state parameter - possible CSRF attack")).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it("should handle Supabase sign in error", async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    window.location.hash = "#id_token=test-token&state=test-state";
    sessionStorage.setItem("apple_auth_state", "test-state");

    mockSignInWithAppleToken.mockRejectedValue(new Error("Invalid token"));

    render(<AppleCallback />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
      expect(screen.getByText("Invalid token")).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it("should handle unexpected errors", async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    window.location.hash = "#id_token=test-token&state=test-state";
    sessionStorage.setItem("apple_auth_state", "test-state");

    mockSignInWithAppleToken.mockRejectedValue("Network error");

    render(<AppleCallback />);

    await waitFor(() => {
      expect(screen.getByText("Sign In Failed")).toBeInTheDocument();
      expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });
});
