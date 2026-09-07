import { vi } from "vitest";
import { useAuth, type AuthState, type GetToken } from "@/lib/auth/use-auth";
import type { User } from "@/types/user";

// The bearer token every authenticated fixture resolves; assert `authorization: "Bearer test-token"`.
export const TEST_TOKEN = "test-token";

export const TEST_USER: User = { uid: "test-user", email: "test@example.com", displayName: "Test User" };

// A signed-in AuthState with the same shape useAuth() returns.
export function authState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    user: TEST_USER,
    isLoaded: true,
    isLoggedIn: true,
    signOut: vi.fn(async () => {}),
    getToken: vi.fn(async () => TEST_TOKEN) as GetToken,
    ...overrides,
  };
}

// A signed-out AuthState: no user, and getToken resolves null (so no Authorization header is sent).
export function signedOutAuth(overrides: Partial<AuthState> = {}): AuthState {
  return authState({
    user: null,
    isLoggedIn: false,
    getToken: vi.fn(async () => null) as GetToken,
    ...overrides,
  });
}

// Makes the mocked useAuth() return the given state and returns it for further assertions.
//
// vi.mock is hoisted per file and cannot be applied from a shared module, so the calling test
// file must keep this one line at its top:
//
//   vi.mock("@/lib/auth/use-auth");
//
// then call mockAuth() in beforeEach (or mockAuth(signedOutAuth()) for the logged-out case).
export function mockAuth(overrides: Partial<AuthState> = {}): AuthState {
  if (!vi.isMockFunction(useAuth)) {
    throw new Error('mockAuth() requires vi.mock("@/lib/auth/use-auth") at the top of the test file');
  }
  const state = authState(overrides);
  vi.mocked(useAuth).mockReturnValue(state);
  return state;
}
