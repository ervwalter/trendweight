import { describe, expect, it } from "vitest";
import { Route } from "@/routes/demo";
import { recordRequests } from "@/test/msw";
import { expectRedirect, routerContext, runLoader } from "@/test/routes";

describe("/demo route", () => {
  it("replaces itself with the demo shared dashboard without any request", async () => {
    const requests = recordRequests();

    await expectRedirect(runLoader(Route, { context: routerContext() }), { to: "/u/$sharingCode", params: { sharingCode: "demo" }, replace: true });

    expect(requests.calls).toEqual([]);
  });
});
