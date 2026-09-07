import { http } from "msw";
import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/api/queries";
import { Route } from "@/routes/u.$sharingCode";
import { buildProfileResponse, buildProviderLink } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json, recordRequests } from "@/test/msw";
import { expectRedirect, routerContext, runLoader } from "@/test/routes";

describe("/u/$sharingCode route", () => {
  it("serves the demo dashboard without any request", async () => {
    const requests = recordRequests();

    await expect(runLoader(Route, { context: routerContext(), params: { sharingCode: "demo" } })).resolves.toBeNull();

    expect(requests.calls).toEqual([]);
  });

  it("checks the profile and then the provider links anonymously, even for a signed-in viewer", async () => {
    server.use(
      http.get("/api/profile/:code", () => json(200, buildProfileResponse({ isMe: false }))),
      http.get("/api/providers/links/:code", () => json(200, [buildProviderLink("withings")])),
    );
    const requests = recordRequests();
    const context = routerContext();

    await expect(runLoader(Route, { context, params: { sharingCode: "abc d" } })).resolves.toBeNull();

    const calls = await requests.settled();
    expect(calls.map((call) => [call.method, call.path])).toEqual([
      ["GET", "/api/profile/abc%20d"],
      ["GET", "/api/providers/links/abc%20d"],
    ]);
    expect(calls.map((call) => call.headers)).toSatisfy((headers: Record<string, string>[]) => headers.every((h) => !("authorization" in h)));
    expect(context.queryClient.getQueryData(queryKeys.profile("abc d"))).toEqual(buildProfileResponse({ isMe: false }));
    expect(context.queryClient.getQueryData(queryKeys.profile())).toBeUndefined();
  });

  it("redirects home without asking for provider links when the sharing code is unknown", async () => {
    server.use(http.get("/api/profile/:code", () => json(404, { error: "Unknown sharing code" })));
    const requests = recordRequests();

    await expectRedirect(runLoader(Route, { context: routerContext(), params: { sharingCode: "abc123" } }), { to: "/", replace: true });

    expect(requests.calls.map((call) => call.path)).toEqual(["/api/profile/abc123"]);
  });

  it("redirects home when the shared account only has a legacy provider", async () => {
    server.use(
      http.get("/api/profile/:code", () => json(200, buildProfileResponse({ isMe: false }))),
      http.get("/api/providers/links/:code", () => json(200, [buildProviderLink("legacy")])),
    );
    const requests = recordRequests();

    await expectRedirect(runLoader(Route, { context: routerContext(), params: { sharingCode: "abc123" } }), { to: "/", replace: true });

    expect(requests.calls).toHaveLength(2);
  });
});
