import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth, safeRedirectPath } from "./auth-guard";
import { redirect } from "@tanstack/react-router";
import type { RouterContext } from "@/router";
import type { ParsedLocation } from "@tanstack/router-core";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn(),
}));

const location = (href: string): ParsedLocation => ({ href, pathname: href.split(/[?#]/)[0] }) as ParsedLocation;

describe("authGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireAuth", () => {
    it("should allow access when user is authenticated", () => {
      const context: Pick<RouterContext, "auth"> = {
        auth: { isLoggedIn: true } as any,
      };

      // Should not throw when authenticated
      expect(() => requireAuth(context, location("/dashboard"))).not.toThrow();
      expect(redirect).not.toHaveBeenCalled();
    });

    it("should redirect to login when user is not authenticated", () => {
      const context: Pick<RouterContext, "auth"> = {
        auth: { isLoggedIn: false } as any,
      };

      const mockRedirect = new Error("Redirect");
      vi.mocked(redirect).mockImplementation(() => {
        throw mockRedirect;
      });

      // Should throw redirect error
      expect(() => requireAuth(context, location("/dashboard"))).toThrow(mockRedirect);

      expect(redirect).toHaveBeenCalledWith({
        to: "/login",
        search: {
          from: "/dashboard",
        },
      });
    });

    it("should preserve the full deep link, including search params, in the redirect", () => {
      const context: Pick<RouterContext, "auth"> = {
        auth: { isLoggedIn: false } as any,
      };

      const mockRedirect = new Error("Redirect");
      vi.mocked(redirect).mockImplementation(() => {
        throw mockRedirect;
      });

      expect(() => requireAuth(context, location("/link?provider=withings&success=true"))).toThrow(mockRedirect);

      expect(redirect).toHaveBeenCalledWith({
        to: "/login",
        search: {
          from: "/link?provider=withings&success=true",
        },
      });
    });

    it("should handle root path redirect", () => {
      const context: Pick<RouterContext, "auth"> = {
        auth: { isLoggedIn: false } as any,
      };

      const mockRedirect = new Error("Redirect");
      vi.mocked(redirect).mockImplementation(() => {
        throw mockRedirect;
      });

      expect(() => requireAuth(context, location("/"))).toThrow(mockRedirect);

      expect(redirect).toHaveBeenCalledWith({
        to: "/login",
        search: {
          from: "/",
        },
      });
    });
  });

  describe("safeRedirectPath", () => {
    it("accepts same-origin paths", () => {
      expect(safeRedirectPath("/settings")).toBe("/settings");
      expect(safeRedirectPath("/link?provider=withings")).toBe("/link?provider=withings");
      expect(safeRedirectPath("/")).toBe("/");
    });

    it("returns the normalized path, search and hash", () => {
      expect(safeRedirectPath("/settings#top")).toBe("/settings#top");
      expect(safeRedirectPath("/dashboard?range=explore#chart")).toBe("/dashboard?range=explore#chart");
      expect(safeRedirectPath("/a b")).toBe("/a%20b");
      expect(safeRedirectPath("/./settings/../download")).toBe("/download");
    });

    it("rejects protocol-relative and backslash-relative URLs", () => {
      expect(safeRedirectPath("//evil.example/phish")).toBeUndefined();
      expect(safeRedirectPath("/\\evil.example/phish")).toBeUndefined();
      expect(safeRedirectPath("/\\\\evil.example/phish")).toBeUndefined();
    });

    it("rejects paths the URL parser would resolve to another origin", () => {
      // Tab and newline are stripped by the WHATWG parser, leaving a protocol-relative URL
      expect(safeRedirectPath("/\t/evil.example/phish")).toBeUndefined();
      expect(safeRedirectPath("/\n/evil.example/phish")).toBeUndefined();
      expect(safeRedirectPath("/\r\n/evil.example")).toBeUndefined();
      expect(safeRedirectPath("/\t\\evil.example")).toBeUndefined();
      // Percent-encoded control characters stay in the path and are harmless
      expect(safeRedirectPath("/%09/evil.example")).toBe("/%09/evil.example");
    });

    it("rejects absolute URLs and schemes", () => {
      expect(safeRedirectPath("https://evil.example/")).toBeUndefined();
      expect(safeRedirectPath("javascript:alert(1)")).toBeUndefined();
      expect(safeRedirectPath("evil.example")).toBeUndefined();
    });

    it("rejects non-string values and the login page itself", () => {
      expect(safeRedirectPath(undefined)).toBeUndefined();
      expect(safeRedirectPath(42)).toBeUndefined();
      expect(safeRedirectPath(["/settings"])).toBeUndefined();
      expect(safeRedirectPath("/login")).toBeUndefined();
      expect(safeRedirectPath("/login?from=/settings")).toBeUndefined();
    });
  });
});
