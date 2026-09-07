import { QueryClient } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { redirect } from "@tanstack/react-router";
import { ensureProfile, ensureProviderLinks } from "./utils";
import type { ProviderLink } from "@/lib/api/types";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  redirect: vi.fn(() => {
    throw new Error("Redirect");
  }),
}));

vi.mock("@/lib/api/queries", () => ({
  queryOptions: {
    providerLinks: vi.fn((sharingCode?: string) => ({
      queryKey: ["providerLinks", sharingCode],
    })),
    profile: vi.fn((_getToken: unknown, sharingCode?: string) => ({
      queryKey: ["profile", sharingCode],
    })),
  },
}));

describe("ensureProfile", () => {
  const mockRedirect = vi.mocked(redirect);
  const nullTokenGetter = vi.fn().mockResolvedValue(null);
  const mockGetToken = vi.fn().mockResolvedValue("mock-token");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authenticated users", () => {
    it("passes when the profile exists and is not newly migrated", async () => {
      const client = new QueryClient();
      const fetchQuery = vi.spyOn(client, "fetchQuery").mockResolvedValue({ user: { firstName: "Sam", isNewlyMigrated: false } });

      await expect(ensureProfile(client, mockGetToken)).resolves.toBeUndefined();

      expect(fetchQuery).toHaveBeenCalledWith({ queryKey: ["profile", undefined] });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("redirects to initial setup when there is no profile yet", async () => {
      const client = new QueryClient();
      vi.spyOn(client, "fetchQuery").mockResolvedValue(null);

      await expect(ensureProfile(client, mockGetToken)).rejects.toThrow("Redirect");
      expect(mockRedirect).toHaveBeenCalledWith({ to: "/initial-setup", replace: true });
    });

    it("redirects to the migration page for a newly migrated profile", async () => {
      const client = new QueryClient();
      // fetchQuery returns the raw ProfileResponse, so the flag lives under `user`
      vi.spyOn(client, "fetchQuery").mockResolvedValue({ user: { firstName: "Sam", isNewlyMigrated: true } });

      await expect(ensureProfile(client, mockGetToken)).rejects.toThrow("Redirect");
      expect(mockRedirect).toHaveBeenCalledWith({ to: "/migration", replace: true });
    });

    it("surfaces server and network failures instead of redirecting", async () => {
      const client = new QueryClient();
      const failure = new Error("Internal Server Error");
      vi.spyOn(client, "fetchQuery").mockRejectedValue(failure);

      await expect(ensureProfile(client, mockGetToken)).rejects.toBe(failure);
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("shared dashboards", () => {
    it("passes when the sharing code resolves to a profile", async () => {
      const client = new QueryClient();
      vi.spyOn(client, "fetchQuery").mockResolvedValue({ user: { firstName: "Sam" } });

      await expect(ensureProfile(client, nullTokenGetter, "abc123")).resolves.toBeUndefined();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("redirects home when the sharing code is unknown", async () => {
      const client = new QueryClient();
      vi.spyOn(client, "fetchQuery").mockResolvedValue(null);

      await expect(ensureProfile(client, nullTokenGetter, "abc123")).rejects.toThrow("Redirect");
      expect(mockRedirect).toHaveBeenCalledWith({ to: "/", replace: true });
    });

    it("surfaces server and network failures instead of silently redirecting home", async () => {
      const client = new QueryClient();
      const failure = new Error("Internal Server Error");
      vi.spyOn(client, "fetchQuery").mockRejectedValue(failure);

      await expect(ensureProfile(client, nullTokenGetter, "abc123")).rejects.toBe(failure);
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });
});

describe("ensureProviderLinks", () => {
  const queryClient = new QueryClient();
  const mockFetchQuery = vi.spyOn(queryClient, "fetchQuery");
  const mockRedirect = vi.mocked(redirect);

  const createProviderLink = (provider: string, isDisabled = false): ProviderLink => ({
    provider,
    connectedAt: "2024-01-01T00:00:00Z",
    hasToken: true,
    isDisabled,
  });

  const mockGetToken = vi.fn().mockResolvedValue("mock-token");

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetToken.mockResolvedValue("mock-token");
  });

  it("uses only the supplied account client", async () => {
    const accountClient = new QueryClient();
    const fetchQuery = vi.spyOn(accountClient, "fetchQuery").mockResolvedValue([createProviderLink("withings")]);
    await ensureProviderLinks(accountClient, mockGetToken);
    expect(fetchQuery).toHaveBeenCalledOnce();
    expect(mockFetchQuery).not.toHaveBeenCalled();
  });

  describe("authenticated users", () => {
    it("passes when user has non-legacy providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings"), createProviderLink("fitbit")]);

      await ensureProviderLinks(queryClient, mockGetToken);

      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("passes when user has both legacy and non-legacy providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings"), createProviderLink("legacy")]);

      await ensureProviderLinks(queryClient, mockGetToken);

      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("redirects to /link when user has no providers", async () => {
      mockFetchQuery.mockResolvedValue([]);

      await expect(ensureProviderLinks(queryClient, mockGetToken)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/link", replace: true });
    });

    it("redirects to /link when user has only legacy provider", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("legacy")]);

      await expect(ensureProviderLinks(queryClient, mockGetToken)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/link", replace: true });
    });

    it("redirects to /link when user has only disabled non-legacy providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings", true), createProviderLink("fitbit", true)]);

      await expect(ensureProviderLinks(queryClient, mockGetToken)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/link", replace: true });
    });

    it("redirects to /link when user has only providers without tokens", async () => {
      mockFetchQuery.mockResolvedValue([{ ...createProviderLink("withings"), hasToken: false }]);

      await expect(ensureProviderLinks(queryClient, mockGetToken)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/link", replace: true });
    });

    it("passes when user has at least one active non-legacy provider", async () => {
      mockFetchQuery.mockResolvedValue([
        createProviderLink("withings"),
        createProviderLink("fitbit", true), // disabled
        createProviderLink("legacy"),
      ]);

      await ensureProviderLinks(queryClient, mockGetToken);

      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("shared dashboards", () => {
    const sharingCode = "test-sharing-code";

    it("passes for demo sharing code", async () => {
      await ensureProviderLinks(queryClient, mockGetToken, "demo");

      expect(mockFetchQuery).not.toHaveBeenCalled();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("passes when shared user has non-legacy providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings")]);

      await ensureProviderLinks(queryClient, mockGetToken, sharingCode);

      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("redirects to / when shared user has no providers", async () => {
      mockFetchQuery.mockResolvedValue([]);

      await expect(ensureProviderLinks(queryClient, mockGetToken, sharingCode)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/", replace: true });
    });

    it("redirects to / when shared user has only legacy provider", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("legacy")]);

      await expect(ensureProviderLinks(queryClient, mockGetToken, sharingCode)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/", replace: true });
    });

    it("redirects to / when shared user has only disabled providers", async () => {
      mockFetchQuery.mockResolvedValue([createProviderLink("withings", true), createProviderLink("legacy")]);

      await expect(ensureProviderLinks(queryClient, mockGetToken, sharingCode)).rejects.toThrow();

      expect(mockRedirect).toHaveBeenCalledWith({ to: "/", replace: true });
    });
  });
});
