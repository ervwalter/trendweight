import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "@tanstack/react-router";
import { ensureProviderLinks } from "./utils";
import { queryClient } from "../query-client";
import type { ProviderLink } from "../api/types";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn(() => {
    throw new Error("Redirect");
  }),
}));

vi.mock("../query-client", () => ({
  queryClient: {
    fetchQuery: vi.fn(),
  },
}));

vi.mock("../api/queries", () => ({
  queryOptions: {
    providerLinks: vi.fn((sharingCode?: string) => ({
      queryKey: ["providerLinks", sharingCode],
    })),
  },
}));

describe("ensureProviderLinks", () => {
  const mockFetchQuery = vi.mocked(queryClient.fetchQuery);
  const mockRedirect = vi.mocked(redirect);

  const createProviderLink = (provider: string, isDisabled = false): ProviderLink => ({
    provider,
    connectedAt: "2024-01-01T00:00:00Z",
    hasToken: true,
    isDisabled,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authenticated users", () => {
    it("passes when user has non-legacy providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings"), createProviderLink("fitbit")]);

      await ensureProviderLinks();

      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("passes when user has both legacy and non-legacy providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings"), createProviderLink("legacy")]);

      await ensureProviderLinks();

      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("redirects to /link when user has no providers", async () => {
      mockFetchQuery.mockResolvedValue([]);

      await expect(ensureProviderLinks()).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/link", replace: true });
    });

    it("redirects to /link when user has only legacy provider", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("legacy")]);

      await expect(ensureProviderLinks()).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/link", replace: true });
    });

    it("redirects to /link when user has only disabled non-legacy providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings", true), createProviderLink("fitbit", true)]);

      await expect(ensureProviderLinks()).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/link", replace: true });
    });

    it("redirects to /link when user has only providers without tokens", async () => {
      mockFetchQuery.mockResolvedValue([{ ...createProviderLink("withings"), hasToken: false }]);

      await expect(ensureProviderLinks()).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/link", replace: true });
    });

    it("passes when user has at least one active non-legacy provider", async () => {
      mockFetchQuery.mockResolvedValue([
        createProviderLink("withings"),
        createProviderLink("fitbit", true), // disabled
        createProviderLink("legacy"),
      ]);

      await ensureProviderLinks();

      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("shared dashboards", () => {
    const sharingCode = "test-sharing-code";

    it("passes for demo sharing code", async () => {
      await ensureProviderLinks("demo");

      expect(mockFetchQuery).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("passes when shared user has non-legacy providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings")]);

      await ensureProviderLinks(sharingCode);

      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("redirects to / when shared user has no providers", async () => {
      mockFetchQuery.mockResolvedValue([]);

      await expect(ensureProviderLinks(sharingCode)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/", replace: true });
    });

    it("redirects to / when shared user has only legacy provider", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("legacy")]);

      await expect(ensureProviderLinks(sharingCode)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/", replace: true });
    });

    it("redirects to / when shared user has only disabled providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings", true), createProviderLink("legacy")]);

      await expect(ensureProviderLinks(sharingCode)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/", replace: true });
    });
  });
});
