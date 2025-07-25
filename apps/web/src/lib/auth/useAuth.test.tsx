import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { AuthContext, type AuthContextType } from "./authContext";
import type { ReactNode } from "react";

describe("useAuth", () => {
  it("should throw error when used outside of AuthProvider", () => {
    // Capture console.error to avoid noise in test output
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow("useAuth must be used within an AuthProvider");

    consoleSpy.mockRestore();
  });

  it("should return auth context when used within AuthProvider", () => {
    const mockAuthContext: AuthContextType = {
      user: {
        uid: "test-user-id",
        email: "test@example.com",
        displayName: "Test User",
      },
      session: {
        access_token: "test-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        token_type: "bearer",
        user: {
          id: "test-user-id",
          email: "test@example.com",
          app_metadata: {},
          user_metadata: {},
          aud: "authenticated",
          created_at: new Date().toISOString(),
        },
      } as any,
      isInitializing: false,
      isLoggedIn: true,
      sendOtpCode: vi.fn(),
      verifyOtpCode: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMicrosoft: vi.fn(),
      signInWithApple: vi.fn(),
      signInWithAppleToken: vi.fn(),
      signOut: vi.fn(),
    };

    const wrapper = ({ children }: { children: ReactNode }) => <AuthContext.Provider value={mockAuthContext}>{children}</AuthContext.Provider>;

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toBe(mockAuthContext);
    expect(result.current.user).toEqual({
      uid: "test-user-id",
      email: "test@example.com",
      displayName: "Test User",
    });
    expect(result.current.isLoggedIn).toBe(true);
  });

  it("should return null user when not logged in", () => {
    const mockAuthContext: AuthContextType = {
      user: null,
      session: null,
      isInitializing: false,
      isLoggedIn: false,
      sendOtpCode: vi.fn(),
      verifyOtpCode: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMicrosoft: vi.fn(),
      signInWithApple: vi.fn(),
      signInWithAppleToken: vi.fn(),
      signOut: vi.fn(),
    };

    const wrapper = ({ children }: { children: ReactNode }) => <AuthContext.Provider value={mockAuthContext}>{children}</AuthContext.Provider>;

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("should return initializing state", () => {
    const mockAuthContext: AuthContextType = {
      user: null,
      session: null,
      isInitializing: true,
      isLoggedIn: false,
      sendOtpCode: vi.fn(),
      verifyOtpCode: vi.fn(),
      signInWithGoogle: vi.fn(),
      signInWithMicrosoft: vi.fn(),
      signInWithApple: vi.fn(),
      signInWithAppleToken: vi.fn(),
      signOut: vi.fn(),
    };

    const wrapper = ({ children }: { children: ReactNode }) => <AuthContext.Provider value={mockAuthContext}>{children}</AuthContext.Provider>;

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isInitializing).toBe(true);
    expect(result.current.isLoggedIn).toBe(false);
  });
});
