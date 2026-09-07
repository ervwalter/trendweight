import { http } from "msw";
import { describe, expect, it } from "vitest";
import { Route } from "@/routes/dashboard";
import { signedOutAuth } from "@/test/auth";
import { buildProfileResponse, buildProviderLink } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json, recordRequests } from "@/test/msw";
import { expectRedirect, routerContext, runBeforeLoad, runLoader } from "@/test/routes";

describe("/dashboard route", () => {
  it("sends signed-out visitors to login, remembering where they were going", async () => {
    const requests = recordRequests();

    await expectRedirect(runBeforeLoad(Route, { context: routerContext({ auth: signedOutAuth() }), location: "/dashboard?range=3m" }), {
      to: "/login",
      search: { from: "/dashboard?range=3m" },
    });

    expect(requests.calls).toEqual([]);
  });

  it("lets signed-in users through beforeLoad", async () => {
    await expect(runBeforeLoad(Route, { context: routerContext(), location: "/dashboard" })).resolves.toBeUndefined();
  });

  it("checks the profile and then the provider links with the bearer token", async () => {
    server.use(
      http.get("/api/profile", () => json(200, buildProfileResponse())),
      http.get("/api/providers/links", () => json(200, [buildProviderLink("withings")])),
    );
    const requests = recordRequests();

    await expect(runLoader(Route, { context: routerContext() })).resolves.toBeNull();

    const calls = await requests.settled();
    expect(calls.map((call) => [call.method, call.path, call.headers.authorization])).toEqual([
      ["GET", "/api/profile", "Bearer test-token"],
      ["GET", "/api/providers/links", "Bearer test-token"],
    ]);
  });

  it("redirects to initial setup without asking for provider links when there is no profile", async () => {
    server.use(http.get("/api/profile", () => json(404, { error: "No profile" })));
    const requests = recordRequests();

    await expectRedirect(runLoader(Route, { context: routerContext() }), { to: "/initial-setup", replace: true });

    expect(requests.calls.map((call) => call.path)).toEqual(["/api/profile"]);
  });

  it("redirects to the link page when only a legacy provider is connected", async () => {
    server.use(
      http.get("/api/profile", () => json(200, buildProfileResponse())),
      http.get("/api/providers/links", () => json(200, [buildProviderLink("legacy")])),
    );
    const requests = recordRequests();

    await expectRedirect(runLoader(Route, { context: routerContext() }), { to: "/link", replace: true });

    expect(requests.calls).toHaveLength(2);
  });
});
