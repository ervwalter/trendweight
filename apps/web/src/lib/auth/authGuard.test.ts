import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "./authGuard";
import { redirect } from "@tanstack/react-router";
import { supabase } from "../supabase/client";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn(),
}));

vi.mock("../supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe("authGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("should allow access when session exists", async () => {
      const mockSession = {
        access_token: "test-token",
        user: { id: "test-user-id" },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      } as any);

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

    it("should redirect to login when no session exists", async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

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
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

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
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      } as any);

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
