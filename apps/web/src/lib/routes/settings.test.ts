import { http } from "msw";
import { describe, expect, it } from "vitest";
import { Route } from "@/routes/settings";
import { signedOutAuth } from "@/test/auth";
import { buildProfileResponse } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json, recordRequests } from "@/test/msw";
import { expectRedirect, routerContext, runBeforeLoad, runLoader } from "@/test/routes";

describe("/settings route", () => {
  it("sends signed-out visitors to login, remembering where they were going", async () => {
    const requests = recordRequests();

    await expectRedirect(runBeforeLoad(Route, { context: routerContext({ auth: signedOutAuth() }), location: "/settings" }), {
      to: "/login",
      search: { from: "/settings" },
    });

    expect(requests.calls).toEqual([]);
  });

  it("only checks the profile, with the bearer token", async () => {
    server.use(http.get("/api/profile", () => json(200, buildProfileResponse())));
    const requests = recordRequests();

    await expect(runLoader(Route, { context: routerContext() })).resolves.toBeNull();

    const calls = await requests.settled();
    expect(calls.map((call) => [call.method, call.path, call.headers.authorization])).toEqual([["GET", "/api/profile", "Bearer test-token"]]);
  });

  it("redirects to initial setup when there is no profile", async () => {
    server.use(http.get("/api/profile", () => json(404, { error: "No profile" })));
    const requests = recordRequests();

    await expectRedirect(runLoader(Route, { context: routerContext() }), { to: "/initial-setup", replace: true });

    expect(requests.calls.map((call) => call.path)).toEqual(["/api/profile"]);
  });

  it("redirects newly migrated users to the migration page", async () => {
    server.use(http.get("/api/profile", () => json(200, buildProfileResponse({ user: { isNewlyMigrated: true } }))));
    const requests = recordRequests();

    await expectRedirect(runLoader(Route, { context: routerContext() }), { to: "/migration", replace: true });

    expect(requests.calls.map((call) => call.path)).toEqual(["/api/profile"]);
  });
});
