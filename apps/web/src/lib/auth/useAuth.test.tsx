import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./useAuth";

// Mock Clerk hooks
const mockUseUser = vi.fn();
const mockUseClerkAuth = vi.fn();
const mockUseClerk = vi.fn();

vi.mock("@clerk/clerk-react", () => ({
  useUser: () => mockUseUser(),
  useAuth: () => mockUseClerkAuth(),
  useClerk: () => mockUseClerk(),
}));

describe("useAuth", () => {
  it("should return user data when logged in", () => {
    mockUseUser.mockReturnValue({
      user: {
        id: "user_123",
        primaryEmailAddress: { emailAddress: "test@example.com" },
        fullName: "Test User",
      },
      isLoaded: true,
    });
    mockUseClerkAuth.mockReturnValue({
      isSignedIn: true,
    });
    mockUseClerk.mockReturnValue({
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toEqual({
      uid: "user_123",
      email: "test@example.com",
      displayName: "Test User",
    });
    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.isInitializing).toBe(false);
  });

  it("should return null user when not logged in", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
    });
    mockUseClerkAuth.mockReturnValue({
      isSignedIn: false,
    });
    mockUseClerk.mockReturnValue({
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.isInitializing).toBe(false);
  });

  it("should return initializing state when Clerk is not loaded", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: false,
    });
    mockUseClerkAuth.mockReturnValue({
      isSignedIn: false,
    });
    mockUseClerk.mockReturnValue({
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isInitializing).toBe(true);
    expect(result.current.isLoggedIn).toBe(false);
  });

  it("should handle user with no full name", () => {
    mockUseUser.mockReturnValue({
      user: {
        id: "user_123",
        primaryEmailAddress: { emailAddress: "test@example.com" },
        fullName: null,
      },
      isLoaded: true,
    });
    mockUseClerkAuth.mockReturnValue({
      isSignedIn: true,
    });
    mockUseClerk.mockReturnValue({
      signOut: vi.fn(),
    });

    const { result } = renderHook(() => useAuth());

    // When fullName is null, it falls back to email address
    expect(result.current.user?.displayName).toBe("test@example.com");
  });
});
