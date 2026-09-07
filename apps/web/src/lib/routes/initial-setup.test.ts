import { http } from "msw";
import { describe, expect, it } from "vitest";
import { Route } from "@/routes/initial-setup";
import { signedOutAuth } from "@/test/auth";
import { buildProfileResponse } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json, recordRequests } from "@/test/msw";
import { expectRedirect, routerContext, runBeforeLoad, runLoader } from "@/test/routes";

describe("/initial-setup route", () => {
  it("sends signed-out visitors to login, remembering where they were going", async () => {
    const requests = recordRequests();

    await expectRedirect(runBeforeLoad(Route, { context: routerContext({ auth: signedOutAuth() }), location: "/initial-setup" }), {
      to: "/login",
      search: { from: "/initial-setup" },
    });

    expect(requests.calls).toEqual([]);
  });

  it("redirects to settings when the user already has a profile", async () => {
    server.use(http.get("/api/profile", () => json(200, buildProfileResponse())));
    const requests = recordRequests();

    await expectRedirect(runLoader(Route, { context: routerContext() }), { to: "/settings", replace: true });

    const calls = await requests.settled();
    expect(calls.map((call) => [call.method, call.path, call.headers.authorization])).toEqual([["GET", "/api/profile", "Bearer test-token"]]);
  });

  it("shows the setup page when there is no profile yet", async () => {
    server.use(http.get("/api/profile", () => json(404, { error: "No profile" })));
    const requests = recordRequests();

    await expect(runLoader(Route, { context: routerContext() })).resolves.toBeNull();

    expect(requests.calls.map((call) => call.path)).toEqual(["/api/profile"]);
  });
});
