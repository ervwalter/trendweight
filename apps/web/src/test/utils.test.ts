import { LocalDate } from "@js-joda/core";
import { useQuery } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";
import { renderHook, screen, waitFor } from "@testing-library/react";
import { http } from "msw";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSyncProgress } from "@/components/dashboard/sync-progress";
import { apiRequest } from "@/lib/api/client";
import { useDashboardData } from "@/lib/dashboard/hooks";
import { Route as DashboardRoute } from "@/routes/dashboard";
import { Route as InitialSetupRoute } from "@/routes/initial-setup";
import { TEST_TOKEN, signedOutAuth } from "./auth";
import { freezeClock } from "./clock";
import { buildProfileResponse } from "./fixtures";
import { server } from "./mocks/server";
import { json, noContent, recordRequests } from "./msw";
import { createTestQueryClient } from "./query-client";
import { createQueryWrapper, renderWithDashboardData, renderWithProviders } from "./render";
import { expectRedirect, routerContext, runBeforeLoad, runLoader } from "./routes";

describe("recordRequests", () => {
  it("captures method, path, search, lower-cased headers and the parsed JSON body", async () => {
    server.use(http.post("/api/echo", () => json(201, { ok: true })));
    const requests = recordRequests();

    const response = await apiRequest<{ ok: boolean }>("/echo?x=1&y=two", {
      method: "POST",
      body: JSON.stringify({ weight: 80.5 }),
      token: TEST_TOKEN,
    });

    expect(response).toEqual({ ok: true });
    const calls = await requests.settled();
    expect(calls).toEqual([
      {
        method: "POST",
        path: "/api/echo",
        search: "?x=1&y=two",
        headers: expect.objectContaining({ authorization: "Bearer test-token", "content-type": "application/json" }),
        body: { weight: 80.5 },
      },
    ]);
    expect(requests.byPath("/api/echo")).toHaveLength(1);
    expect(requests.byPath("/api/other")).toHaveLength(0);
  });

  it("records an undefined body for requests without one and preserves path encoding", async () => {
    server.use(http.delete("/api/profile/:code", () => noContent()));
    const requests = recordRequests();

    const response = await apiRequest("/profile/abc%20d", { method: "DELETE" });

    expect(response).toBeNull();
    const [call] = await requests.settled();
    expect(call).toMatchObject({ method: "DELETE", path: "/api/profile/abc%20d", search: "", body: undefined });
    expect(call.headers).not.toHaveProperty("authorization");
  });
});

describe("freezeClock", () => {
  it("freezes Date and js-joda's LocalDate.now()", () => {
    const frozen = freezeClock("2024-01-15T12:00:00");

    expect(Date.now()).toBe(frozen.getTime());
    expect(new Date().getTime()).toBe(frozen.getTime());
    expect(LocalDate.now().toString()).toBe("2024-01-15");
  });

  it("restores real time once the previous test has finished", () => {
    expect(vi.isFakeTimers()).toBe(false);
    expect(LocalDate.now().toString()).not.toBe("2024-01-15");
  });
});

describe("expectRedirect", () => {
  it("matches a thrown redirect's options", async () => {
    const thrown = Promise.reject(redirect({ to: "/login", replace: true, search: { from: "/dashboard" } }));

    const result = await expectRedirect(thrown, { to: "/login", replace: true, search: { from: "/dashboard" } });

    expect(result.status).toBe(307);
  });

  it("fails when the promise resolves or rejects with something else", async () => {
    await expect(expectRedirect(Promise.resolve(null), { to: "/login" })).rejects.toThrow(/expected a redirect/);
    await expect(expectRedirect(Promise.reject(new Error("boom")), { to: "/login" })).rejects.toThrow(/Error: boom/);
    await expect(expectRedirect(Promise.reject(redirect({ to: "/settings" })), { to: "/login" })).rejects.toThrow();
  });
});

describe("runLoader and runBeforeLoad", () => {
  it("runs a real route loader against MSW and surfaces its redirect", async () => {
    server.use(http.get("/api/profile", () => json(200, buildProfileResponse())));
    const requests = recordRequests();
    const context = routerContext();

    await expectRedirect(runLoader(InitialSetupRoute, { context }), { to: "/settings", replace: true });

    const [call] = await requests.settled();
    expect(call).toMatchObject({ method: "GET", path: "/api/profile", headers: expect.objectContaining({ authorization: "Bearer test-token" }) });
    expect(context.queryClient.getQueryData(["profile"])).toEqual(buildProfileResponse());
  });

  it("resolves with the loader's return value", async () => {
    server.use(http.get("/api/profile", () => json(404, { error: "No profile" })));

    await expect(runLoader(InitialSetupRoute, { context: routerContext() })).resolves.toBeNull();
  });

  it("runs beforeLoad with the given location so auth guards can redirect back", async () => {
    const context = routerContext({ auth: signedOutAuth() });

    await expectRedirect(runBeforeLoad(DashboardRoute, { context, location: "/dashboard?range=3m" }), {
      to: "/login",
      search: { from: "/dashboard?range=3m" },
    });
    await expect(runBeforeLoad(DashboardRoute, { context: routerContext() })).resolves.toBeUndefined();
  });
});

describe("createQueryWrapper", () => {
  it("lets renderHook resolve a useQuery through the test client", async () => {
    const queryClient = createTestQueryClient();

    const { result } = renderHook(() => useQuery({ queryKey: ["answer"], queryFn: async () => 42 }), {
      wrapper: createQueryWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.data).toBe(42));
    expect(queryClient.getQueryData(["answer"])).toBe(42);
  });
});

describe("renderWithProviders", () => {
  function ProgressProbe() {
    const { progressId } = useSyncProgress();
    return createElement("span", null, `progress:${progressId}`);
  }

  it("mounts the real SyncProgressProvider when asked", () => {
    const { queryClient } = renderWithProviders(createElement(ProgressProbe), { syncProgress: true });

    expect(screen.getByText(/^progress:[0-9a-f-]{36}$/)).toBeInTheDocument();
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
  });
});

describe("renderWithDashboardData", () => {
  function NameProbe() {
    const { profile, timeRange } = useDashboardData();
    return createElement("span", null, `${profile.firstName}/${timeRange[0]}`);
  }

  it("provides dashboard data through the real context and can re-render with new data", () => {
    const { data, rerenderWithDashboardData } = renderWithDashboardData(createElement(NameProbe), { timeRange: ["3m", vi.fn()] });

    expect(screen.getByText("Alex/3m")).toBeInTheDocument();
    expect(data.mode[0]).toBe("weight");

    rerenderWithDashboardData({ profile: { ...data.profile, firstName: "Sam" } });

    expect(screen.getByText("Sam/4w")).toBeInTheDocument();
  });
});
