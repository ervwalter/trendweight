import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "./auth-guard";
import { redirect } from "@tanstack/react-router";
import type { RouterContext } from "@/router";
import type { ParsedLocation } from "@tanstack/router-core";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn(),
}));

describe("authGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("should allow access when user is authenticated", () => {
      const context: RouterContext = {
        auth: { isLoggedIn: true } as any,
      };

      const location: ParsedLocation = {
        pathname: "/dashboard",
      } as ParsedLocation;

      // Should not throw when authenticated
      expect(() => requireAuth(context, location)).not.toThrow();
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should redirect to login when user is not authenticated", () => {
      const context: RouterContext = {
        auth: { isLoggedIn: false } as any,
      };

      const location: ParsedLocation = {
        pathname: "/dashboard",
      } as ParsedLocation;

      const mockRedirect = new Error("Redirect");
      vi.mocked(redirect).mockImplementation(() => {
        throw mockRedirect;
      });

      // Should throw redirect error
      expect(() => requireAuth(context, location)).toThrow(mockRedirect);

      expect(redirect).toHaveBeenCalledWith({
        to: "/login",
        search: {
          from: "/dashboard",
        },
      });
    });

    it("should preserve original path in redirect", () => {
      const context: RouterContext = {
        auth: { isLoggedIn: false } as any,
      };

      const location: ParsedLocation = {
        pathname: "/settings/profile",
      } as ParsedLocation;

      const mockRedirect = new Error("Redirect");
      vi.mocked(redirect).mockImplementation(() => {
        throw mockRedirect;
      });

      expect(() => requireAuth(context, location)).toThrow(mockRedirect);

      expect(redirect).toHaveBeenCalledWith({
        to: "/login",
        search: {
          from: "/settings/profile",
        },
      });
    });

    it("should handle root path redirect", () => {
      const context: RouterContext = {
        auth: { isLoggedIn: false } as any,
      };

      const location: ParsedLocation = {
        pathname: "/",
      } as ParsedLocation;

      const mockRedirect = new Error("Redirect");
      vi.mocked(redirect).mockImplementation(() => {
        throw mockRedirect;
      });

      expect(() => requireAuth(context, location)).toThrow(mockRedirect);

      expect(redirect).toHaveBeenCalledWith({
        to: "/login",
        search: {
          from: "/",
        },
      });
    });
  });
});
