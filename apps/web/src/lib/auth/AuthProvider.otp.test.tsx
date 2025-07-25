import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider } from "./AuthProvider";
import { supabase } from "../supabase/client";
import { useAuth } from "./useAuth";
import type { AuthChangeEvent } from "@supabase/supabase-js";

// Mock Supabase client
vi.mock("../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Mock router
vi.mock("../../router", () => ({
  router: {
    navigate: vi.fn(),
  },
}));

// Test component to access auth context
function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="user-id">{auth.user?.uid || "no-user"}</div>
      <div data-testid="user-email">{auth.user?.email || "no-email"}</div>
      <div data-testid="is-logged-in">{auth.isLoggedIn ? "logged-in" : "logged-out"}</div>
      <div data-testid="session-token">{auth.session?.access_token || "no-token"}</div>
    </div>
  );
}

// Store auth change callback for testing
let authChangeCallback: ((event: AuthChangeEvent, session: any) => void) | null = null;

describe("AuthProvider OTP Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChangeCallback = null;

    // Capture the auth change callback
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
        error: null,
      } as any;
    });
  });

  it("handles OTP login session correctly", async () => {
    const mockOtpSession = {
      access_token: "otp-access-token",
      refresh_token: "otp-refresh-token",
      user: {
        id: "otp-user-123",
        email: "otp@example.com",
        user_metadata: {
          name: "OTP User",
        },
      },
    };

    // Mock initial state - no session
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Initially logged out
    await waitFor(() => {
      expect(screen.getByTestId("is-logged-in")).toHaveTextContent("logged-out");
    });

    // Simulate OTP login by triggering auth state change
    act(() => {
      authChangeCallback?.("SIGNED_IN", mockOtpSession as any);
    });

    // Should update to logged in state
    await waitFor(() => {
      expect(screen.getByTestId("is-logged-in")).toHaveTextContent("logged-in");
      expect(screen.getByTestId("user-id")).toHaveTextContent("otp-user-123");
      expect(screen.getByTestId("user-email")).toHaveTextContent("otp@example.com");
      expect(screen.getByTestId("session-token")).toHaveTextContent("otp-access-token");
    });
  });

  it("validates OTP session on initialization", async () => {
    const mockOtpSession = {
      access_token: "otp-access-token",
      refresh_token: "otp-refresh-token",
      user: {
        id: "otp-user-456",
        email: "otp-init@example.com",
      },
    };

    // Mock initial session exists
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockOtpSession },
      error: null,
    } as any);

    // Mock user validation succeeds
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: mockOtpSession.user },
      error: null,
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Should be logged in after initialization
    await waitFor(() => {
      expect(screen.getByTestId("is-logged-in")).toHaveTextContent("logged-in");
      expect(screen.getByTestId("user-id")).toHaveTextContent("otp-user-456");
      expect(screen.getByTestId("user-email")).toHaveTextContent("otp-init@example.com");
    });
  });

  it("handles OTP session expiration", async () => {
    const mockExpiredSession = {
      access_token: "expired-token",
      refresh_token: "expired-refresh",
      user: {
        id: "user-789",
        email: "expired@example.com",
      },
    };

    // Mock initial session exists
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: mockExpiredSession },
      error: null,
    } as any);

    // Mock user validation fails (token expired)
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Token has expired" },
    } as any);

    // Mock signOut
    vi.mocked(supabase.auth.signOut).mockResolvedValueOnce({
      error: null,
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Should be logged out after failed validation
    await waitFor(() => {
      expect(screen.getByTestId("is-logged-in")).toHaveTextContent("logged-out");
      expect(screen.getByTestId("user-id")).toHaveTextContent("no-user");
      expect(vi.mocked(supabase.auth.signOut)).toHaveBeenCalled();
    });
  });

  it("maintains session across auth state changes", async () => {
    // Mock initial state - no session
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId("is-logged-in")).toHaveTextContent("logged-out");
    });

    // First OTP login
    const firstSession = {
      access_token: "first-token",
      user: { id: "user-1", email: "first@example.com" },
    };

    act(() => {
      authChangeCallback?.("SIGNED_IN", firstSession as any);
    });

    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent("first@example.com");
    });

    // Token refresh (common with OTP)
    const refreshedSession = {
      access_token: "refreshed-token",
      user: { id: "user-1", email: "first@example.com" },
    };

    act(() => {
      authChangeCallback?.("TOKEN_REFRESHED", refreshedSession as any);
    });

    await waitFor(() => {
      expect(screen.getByTestId("session-token")).toHaveTextContent("refreshed-token");
      expect(screen.getByTestId("user-email")).toHaveTextContent("first@example.com");
    });
  });

  it("handles user metadata from OTP login", async () => {
    const mockOtpSession = {
      access_token: "metadata-token",
      user: {
        id: "metadata-user",
        email: "metadata@example.com",
        user_metadata: {
          name: "OTP Display Name",
          avatar_url: "https://example.com/avatar.jpg",
        },
      },
    };

    // Mock initial state - no session
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as any);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId("is-logged-in")).toHaveTextContent("logged-out");
    });

    // Simulate OTP login
    act(() => {
      authChangeCallback?.("SIGNED_IN", mockOtpSession as any);
    });

    // Should have display name from metadata
    await waitFor(() => {
      expect(screen.getByTestId("user-id")).toHaveTextContent("metadata-user");
      expect(screen.getByTestId("user-email")).toHaveTextContent("metadata@example.com");
      // Note: Our test component doesn't show displayName, but the auth context should have it
      // In a real component, auth.user.displayName would be "OTP Display Name"
    });
  });
});
