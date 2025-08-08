import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "./auth-guard";
import { redirect } from "@tanstack/react-router";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn(),
}));

// Mock window.Clerk
const mockClerk = {
  user: null as any,
  loaded: true,
};

// @ts-expect-error - Mock window.Clerk for testing
global.window = {
  Clerk: mockClerk,
};

describe("authGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerk.user = null;
  });

  describe("requireAuth", () => {
    it("should allow access when user is authenticated", async () => {
      mockClerk.user = { id: "user_123" };

      const context = {
        location: {
          pathname: "/dashboard",
          href: "http://localhost/dashboard",
          search: {},
        },
      };

      // Should not throw when authenticated
      await expect(requireAuth(context)).resolves.toBeUndefined();
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should redirect to login when user is not authenticated", async () => {
      mockClerk.user = null;

      const mockRedirect = new Error("Redirect");
      vi.mocked(redirect).mockImplementation(() => {
        throw mockRedirect;
      });

      const context = {
        location: {
          pathname: "/dashboard",
          href: "http://localhost/dashboard",
          search: {},
        },
      };

      // Should throw redirect error
      await expect(requireAuth(context)).rejects.toThrow(mockRedirect);

      expect(redirect).toHaveBeenCalledWith({
        to: "/login",
        search: {
          from: "/dashboard",
        },
      });
    });

    it("should preserve original path in redirect", async () => {
      mockClerk.user = null;

      const mockRedirect = new Error("Redirect");
      vi.mocked(redirect).mockImplementation(() => {
        throw mockRedirect;
      });

      const context = {
        location: {
          pathname: "/settings/profile",
          href: "http://localhost/settings/profile",
          search: { tab: "basic" },
        },
      };

      await expect(requireAuth(context)).rejects.toThrow(mockRedirect);

      expect(redirect).toHaveBeenCalledWith({
        to: "/login",
        search: {
          from: "/settings/profile",
        },
      });
    });

    it("should handle root path redirect", async () => {
      mockClerk.user = null;

      const mockRedirect = new Error("Redirect");
      vi.mocked(redirect).mockImplementation(() => {
        throw mockRedirect;
      });

      const context = {
        location: {
          pathname: "/",
          href: "http://localhost/",
          search: {},
        },
      };

      await expect(requireAuth(context)).rejects.toThrow(mockRedirect);

      expect(redirect).toHaveBeenCalledWith({
        to: "/login",
        search: {
          from: "/",
        },
      });
    });
  });
});
