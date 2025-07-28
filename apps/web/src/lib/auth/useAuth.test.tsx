import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
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

// Mock TanStack Query
const mockQueryClient = {
  clear: vi.fn(),
};

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mockQueryClient,
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

  it("should clear query cache on sign out", async () => {
    const mockSignOut = vi.fn();
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
      signOut: mockSignOut,
    });

    const { result } = renderHook(() => useAuth());

    // Call signOut
    await act(async () => {
      await result.current.signOut();
    });

    // Verify Clerk signOut was called with default redirect
    expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: "/" });

    // Verify query cache was cleared
    expect(mockQueryClient.clear).toHaveBeenCalled();
  });

  it("should sign out with custom redirectUrl", async () => {
    const mockSignOut = vi.fn();
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
      signOut: mockSignOut,
    });

    const { result } = renderHook(() => useAuth());

    // Call signOut with custom redirectUrl
    await act(async () => {
      await result.current.signOut("/account-deleted");
    });

    // Verify Clerk signOut was called with custom redirect
    expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: "/account-deleted" });

    // Verify query cache was cleared
    expect(mockQueryClient.clear).toHaveBeenCalled();
  });
});
