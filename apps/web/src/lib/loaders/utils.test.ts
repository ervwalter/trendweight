import { isRedirect } from "@tanstack/react-router";
import { http } from "msw";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/queries";
import type { ProviderLink } from "@/lib/api/types";
import type { GetToken } from "@/lib/auth/use-auth";
import { TEST_TOKEN } from "@/test/auth";
import { buildProfileResponse, buildProviderLink } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json, recordRequests } from "@/test/msw";
import { createTestQueryClient } from "@/test/query-client";
import { expectRedirect } from "@/test/routes";
import { ensureProfile, ensureProviderLinks } from "./utils";

const getToken: GetToken = async () => TEST_TOKEN;
// Shared dashboards are fetched anonymously
const noToken: GetToken = async () => null;

// Resolves with whatever the promise rejects with (undefined when it resolves)
const rejectionOf = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => error,
  );

describe("ensureProfile", () => {
  describe("authenticated users", () => {
    it("passes when the profile exists, sending the bearer token and caching the response", async () => {
      server.use(http.get("/api/profile", () => json(200, buildProfileResponse())));
      const requests = recordRequests();
      const client = createTestQueryClient();

      await expect(ensureProfile(client, getToken)).resolves.toBeUndefined();

      const calls = await requests.settled();
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ method: "GET", path: "/api/profile", headers: expect.objectContaining({ authorization: `Bearer ${TEST_TOKEN}` }) });
      expect(client.getQueryData(queryKeys.profile())).toEqual(buildProfileResponse());
    });

    it("redirects to initial setup when the profile query normalises a 404 to null", async () => {
      server.use(http.get("/api/profile", () => json(404, { error: "No profile" })));
      const client = createTestQueryClient();

      await expectRedirect(ensureProfile(client, getToken), { to: "/initial-setup", replace: true });

      expect(client.getQueryData(queryKeys.profile())).toBeNull();
    });

    it("redirects to the migration page by reading the raw ProfileResponse that fetchQuery returns (select is not applied)", async () => {
      server.use(http.get("/api/profile", () => json(200, buildProfileResponse({ user: { isNewlyMigrated: true } }))));
      const client = createTestQueryClient();

      await expectRedirect(ensureProfile(client, getToken), { to: "/migration", replace: true });

      // The cache holds the envelope, so the flag really is at profile.user.isNewlyMigrated
      expect(client.getQueryData(queryKeys.profile())).toMatchObject({ user: { isNewlyMigrated: true } });
    });

    it("surfaces a server failure as an ApiError instead of redirecting", async () => {
      server.use(http.get("/api/profile", () => json(500, { error: "Database unavailable" })));

      const failure = await rejectionOf(ensureProfile(createTestQueryClient(), getToken));

      expect(failure).toBeInstanceOf(ApiError);
      expect(failure).toMatchObject({ status: 500, message: "Database unavailable" });
      expect(isRedirect(failure)).toBe(false);
    });
  });

  describe("shared dashboards", () => {
    it("fetches the encoded sharing code anonymously and caches it under the sharing code's key", async () => {
      server.use(http.get("/api/profile/:code", () => json(200, buildProfileResponse({ isMe: false }))));
      const requests = recordRequests();
      const client = createTestQueryClient();

      await expect(ensureProfile(client, noToken, "abc d")).resolves.toBeUndefined();

      const calls = await requests.settled();
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ method: "GET", path: "/api/profile/abc%20d" });
      expect(calls[0].headers).not.toHaveProperty("authorization");
      expect(client.getQueryData(queryKeys.profile("abc d"))).toEqual(buildProfileResponse({ isMe: false }));
      expect(client.getQueryData(queryKeys.profile())).toBeUndefined();
    });

    it("redirects home when the sharing code is unknown", async () => {
      server.use(http.get("/api/profile/:code", () => json(404, { error: "Unknown sharing code" })));
      const client = createTestQueryClient();

      await expectRedirect(ensureProfile(client, noToken, "abc123"), { to: "/", replace: true });

      expect(client.getQueryData(queryKeys.profile("abc123"))).toBeNull();
    });

    it("surfaces a server failure as an ApiError instead of silently redirecting home", async () => {
      server.use(http.get("/api/profile/:code", () => json(500, { error: "Database unavailable" })));

      const failure = await rejectionOf(ensureProfile(createTestQueryClient(), noToken, "abc123"));

      expect(failure).toBeInstanceOf(ApiError);
      expect(failure).toMatchObject({ status: 500 });
      expect(isRedirect(failure)).toBe(false);
    });

    it("makes no request for the demo dashboard", async () => {
      const requests = recordRequests();

      await expect(ensureProfile(createTestQueryClient(), noToken, "demo")).resolves.toBeUndefined();

      expect(requests.calls).toEqual([]);
    });
  });
});

describe("ensureProviderLinks", () => {
  // Link lists that do not count as a connected scale
  const rejectedLinks: Array<[string, ProviderLink[]]> = [
    ["no links", []],
    ["only a legacy link", [buildProviderLink("legacy")]],
    ["only disabled links", [buildProviderLink("withings", { isDisabled: true }), buildProviderLink("fitbit", { isDisabled: true })]],
    ["only links without a token", [buildProviderLink("withings", { hasToken: false })]],
  ];
  // Link lists with at least one usable non-legacy provider
  const acceptedLinks: Array<[string, ProviderLink[]]> = [
    ["a legacy link and a connected provider", [buildProviderLink("legacy"), buildProviderLink("withings")]],
    [
      "one active provider among disabled and legacy links",
      [buildProviderLink("fitbit", { isDisabled: true }), buildProviderLink("legacy"), buildProviderLink("withings")],
    ],
  ];

  describe("authenticated users", () => {
    it("passes with a connected provider, sending the bearer token and caching the links", async () => {
      const links = [buildProviderLink("withings")];
      server.use(http.get("/api/providers/links", () => json(200, links)));
      const requests = recordRequests();
      const client = createTestQueryClient();

      await expect(ensureProviderLinks(client, getToken)).resolves.toBeUndefined();

      const calls = await requests.settled();
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({
        method: "GET",
        path: "/api/providers/links",
        headers: expect.objectContaining({ authorization: `Bearer ${TEST_TOKEN}` }),
      });
      expect(client.getQueryData(queryKeys.providerLinks())).toEqual(links);
    });

    it("redirects to /link when the links query normalises a 404 to an empty list", async () => {
      server.use(http.get("/api/providers/links", () => json(404, { error: "No links" })));
      const client = createTestQueryClient();

      await expectRedirect(ensureProviderLinks(client, getToken), { to: "/link", replace: true });

      expect(client.getQueryData(queryKeys.providerLinks())).toEqual([]);
    });

    it.each(rejectedLinks)("redirects to /link with %s", async (_description, links) => {
      server.use(http.get("/api/providers/links", () => json(200, links)));
      const client = createTestQueryClient();

      await expectRedirect(ensureProviderLinks(client, getToken), { to: "/link", replace: true });

      expect(client.getQueryData(queryKeys.providerLinks())).toEqual(links);
    });

    it.each(acceptedLinks)("passes with %s", async (_description, links) => {
      server.use(http.get("/api/providers/links", () => json(200, links)));

      await expect(ensureProviderLinks(createTestQueryClient(), getToken)).resolves.toBeUndefined();
    });
  });

  describe("shared dashboards", () => {
    it("fetches the encoded sharing code's links anonymously and caches them under the sharing code's key", async () => {
      const links = [buildProviderLink("withings")];
      server.use(http.get("/api/providers/links/:code", () => json(200, links)));
      const requests = recordRequests();
      const client = createTestQueryClient();

      await expect(ensureProviderLinks(client, noToken, "abc d")).resolves.toBeUndefined();

      const calls = await requests.settled();
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ method: "GET", path: "/api/providers/links/abc%20d" });
      expect(calls[0].headers).not.toHaveProperty("authorization");
      expect(client.getQueryData(queryKeys.providerLinks("abc d"))).toEqual(links);
      expect(client.getQueryData(queryKeys.providerLinks())).toBeUndefined();
    });

    it("redirects home when the links query normalises a 404 to an empty list", async () => {
      server.use(http.get("/api/providers/links/:code", () => json(404, { error: "Unknown sharing code" })));
      const client = createTestQueryClient();

      await expectRedirect(ensureProviderLinks(client, noToken, "abc123"), { to: "/", replace: true });

      expect(client.getQueryData(queryKeys.providerLinks("abc123"))).toEqual([]);
    });

    it.each(rejectedLinks)("redirects home with %s", async (_description, links) => {
      server.use(http.get("/api/providers/links/:code", () => json(200, links)));
      const client = createTestQueryClient();

      await expectRedirect(ensureProviderLinks(client, noToken, "abc123"), { to: "/", replace: true });

      expect(client.getQueryData(queryKeys.providerLinks("abc123"))).toEqual(links);
    });

    it.each(acceptedLinks)("passes with %s", async (_description, links) => {
      server.use(http.get("/api/providers/links/:code", () => json(200, links)));

      await expect(ensureProviderLinks(createTestQueryClient(), noToken, "abc123")).resolves.toBeUndefined();
    });

    it("makes no request for the demo dashboard", async () => {
      const requests = recordRequests();

      await expect(ensureProviderLinks(createTestQueryClient(), noToken, "demo")).resolves.toBeUndefined();

      expect(requests.calls).toEqual([]);
    });
  });
});
