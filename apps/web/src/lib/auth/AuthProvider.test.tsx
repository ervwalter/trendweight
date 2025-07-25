import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";
import { supabase } from "../supabase/client";
import { authSuspenseManager } from "./authSuspense";
import { router } from "../../router";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";

// Mock the dependencies
vi.mock("../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithOtp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

vi.mock("./authSuspense", () => ({
  authSuspenseManager: {
    setInitializing: vi.fn(),
  },
}));

vi.mock("../../router", () => ({
  router: {
    navigate: vi.fn(),
  },
}));

// Mock window.AppleID
const mockAppleID = {
  auth: {
    signIn: vi.fn(),
  },
};

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    // @ts-expect-error - Adding AppleID to window for tests
    window.AppleID = mockAppleID;
  });

  const createMockSession = (overrides?: Partial<Session>): Session => ({
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "test-user-id",
      email: "test@example.com",
      app_metadata: {},
      user_metadata: { name: "Test User" },
      aud: "authenticated",
      created_at: new Date().toISOString(),
    } as SupabaseUser,
    ...overrides,
  });

  describe("initialization", () => {
    it("should initialize with null user when no session exists", async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // No need to mock getUser since it won't be called without a session

      const unsubscribe = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe } },
        error: null,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isLoggedIn).toBe(false);
      expect(authSuspenseManager.setInitializing).toHaveBeenCalledWith(false);
    });

    it("should initialize with user when session exists and is valid", async () => {
      const mockSession = createMockSession();

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock getUser to validate the session
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });

      const unsubscribe = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe } },
        error: null,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.user).toEqual({
        uid: "test-user-id",
        email: "test@example.com",
        displayName: "Test User",
      });
      expect(result.current.session).toBe(mockSession);
      expect(result.current.isLoggedIn).toBe(true);
    });

    it("should trust cached session without validation", async () => {
      const mockSession = createMockSession();

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const unsubscribe = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe } },
        error: null,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      // Should trust the cached session without calling getUser
      expect(supabase.auth.getUser).not.toHaveBeenCalled();
      expect(result.current.user).toEqual({
        uid: mockSession.user.id,
        email: mockSession.user.email,
        displayName: mockSession.user.user_metadata?.name || null,
      });
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isLoggedIn).toBe(true);
    });

    it("should clean up subscription on unmount", () => {
      const unsubscribe = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe } },
        error: null,
      } as any);

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { unmount } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe("social sign-in", () => {
    beforeEach(() => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
        error: null,
      } as any);
    });

    it("should sign in with Google", async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: "google", url: "https://google.com/auth" },
        error: null,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithGoogle();
      });

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/verify`,
        },
      });
    });

    it("should sign in with Microsoft", async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: "azure", url: "https://microsoft.com/auth" },
        error: null,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithMicrosoft();
      });

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "azure",
        options: {
          redirectTo: `${window.location.origin}/auth/verify`,
          scopes: "email",
        },
      });
    });

    it("should sign in with Apple", async () => {
      mockAppleID.auth.signIn.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithApple();
      });

      expect(mockAppleID.auth.signIn).toHaveBeenCalled();
    });

    it("should throw error when Apple Sign In is not available", async () => {
      // Removing AppleID for test
      window.AppleID = undefined;

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signInWithApple();
        }),
      ).rejects.toThrow("Apple Sign In is not available");
    });

    it("should handle Apple sign-in errors", async () => {
      // Suppress expected console.error for this test
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockError = new Error("Apple sign-in failed");
      mockAppleID.auth.signIn.mockRejectedValue(mockError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signInWithApple();
        }),
      ).rejects.toThrow("Apple sign-in failed");

      expect(sessionStorage.getItem("apple_auth_state")).toBeNull();
      expect(sessionStorage.getItem("apple_auth_redirect")).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe("signOut", () => {
    beforeEach(() => {
      const mockSession = createMockSession();
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock getUser to return valid user so session validation passes
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
        error: null,
      } as any);
    });

    it("should sign out successfully", async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it("should handle missing session error", async () => {
      // Suppress expected console.error for this test
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: { message: "Auth session missing!" } as any,
      });

      // Mock window.location.reload
      const reloadSpy = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadSpy, origin: "http://localhost" },
        writable: true,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      // Add some Supabase keys to localStorage
      localStorage.setItem("sb-test-key", "value");
      localStorage.setItem("supabase.auth.token", "token");
      localStorage.setItem("other-key", "value");

      await act(async () => {
        await result.current.signOut();
      });

      // Should clear Supabase localStorage items
      expect(localStorage.getItem("sb-test-key")).toBeNull();
      expect(localStorage.getItem("supabase.auth.token")).toBeNull();
      expect(localStorage.getItem("other-key")).toBe("value"); // Should not clear non-Supabase items

      expect(router.navigate).toHaveBeenCalledWith({ to: "/" });
      expect(reloadSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should throw error for other sign out errors", async () => {
      // Suppress expected console.error for this test
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const mockError = new Error("Network error");
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: mockError as any,
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.signOut();
        }),
      ).rejects.toThrow("Network error");

      consoleErrorSpy.mockRestore();
    });
  });

  describe("auth state changes", () => {
    it("should handle SIGNED_OUT event", async () => {
      const mockSession = createMockSession();
      let authChangeCallback: ((event: any, session: Session | null) => void) | null = null;

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock getUser to validate the session
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
          error: null,
        } as any;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.user).not.toBeNull();

      // Simulate sign out event
      act(() => {
        authChangeCallback?.("SIGNED_OUT", null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith({ to: "/" });
    });

    it("should handle session updates", async () => {
      let authChangeCallback: ((event: any, session: Session | null) => void) | null = null;

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
        authChangeCallback = callback;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
          error: null,
        } as any;
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Simulate sign in event
      const newSession = createMockSession();
      act(() => {
        authChangeCallback?.("SIGNED_IN", newSession);
      });

      expect(result.current.user).toEqual({
        uid: "test-user-id",
        email: "test@example.com",
        displayName: "Test User",
      });
      expect(result.current.session).toBe(newSession);
    });
  });

  describe("user transformation", () => {
    it("should handle users without metadata", async () => {
      const mockSession = createMockSession({
        user: {
          id: "test-user-id",
          email: "test@example.com",
          app_metadata: {},
          user_metadata: {}, // No name
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as SupabaseUser,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock getUser to validate the session
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
        error: null,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.user).toEqual({
        uid: "test-user-id",
        email: "test@example.com",
        displayName: null,
      });
    });

    it("should handle users without email", async () => {
      const mockSession = createMockSession({
        user: {
          id: "test-user-id",
          email: null,
          app_metadata: {},
          user_metadata: { name: "Test User" },
          aud: "authenticated",
          created_at: new Date().toISOString(),
        } as any,
      });

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock getUser to validate the session
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockSession.user },
        error: null,
      });

      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
        error: null,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.isInitializing).toBe(false);
      });

      expect(result.current.user).toEqual({
        uid: "test-user-id",
        email: null,
        displayName: "Test User",
      });
    });
  });
});
