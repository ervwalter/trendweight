import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { server } from "@/test/mocks/server";
import { json, recordRequests } from "@/test/msw";
import { useChangelog } from "./use-changelog";

const REPO = "trendweight/trendweight";
const TAG = "v2.4.0";
const RELEASE_URL = `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`;

describe("useChangelog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the GitHub release for a tagged build and exposes its body", async () => {
    server.use(http.get(RELEASE_URL, () => json(200, { tag_name: TAG, body: "## What's new\n- Faster charts" })));
    const requests = recordRequests();

    const { result } = renderHook(() => useChangelog(TAG, REPO, true, REPO));

    expect(result.current.loadingChangelog).toBe(true);
    await waitFor(() => expect(result.current.loadingChangelog).toBe(false));
    expect(result.current.changelog).toBe("## What's new\n- Faster charts");
    expect(requests.calls).toHaveLength(1);
    expect(requests.calls[0]).toMatchObject({ method: "GET", path: `/repos/${REPO}/releases/tags/${TAG}` });
  });

  it.each([
    ["a non-tag build", "abc1234", REPO, false, REPO],
    ["a local build", "local", REPO, true, REPO],
    ["an unavailable build", "Not available", REPO, true, REPO],
    ["a build with no GitHub repository", TAG, REPO, true, null],
  ])("does not fetch and is not loading for %s", async (_label, version, buildRepo, isTag, githubRepo) => {
    const requests = recordRequests();

    const { result } = renderHook(() => useChangelog(version, buildRepo, isTag, githubRepo));

    expect(result.current.loadingChangelog).toBe(false);
    expect(result.current.changelog).toBeNull();
    // Let any effect-scheduled fetch run before checking that none did
    await act(async () => {});
    expect(requests.calls).toHaveLength(0);
  });

  it("leaves the changelog empty when the release is not found", async () => {
    server.use(http.get(RELEASE_URL, () => json(404, { message: "Not Found" })));

    const { result } = renderHook(() => useChangelog(TAG, REPO, true, REPO));

    await waitFor(() => expect(result.current.loadingChangelog).toBe(false));
    expect(result.current.changelog).toBeNull();
  });

  it("leaves the changelog empty when the release has no body", async () => {
    server.use(http.get(RELEASE_URL, () => json(200, { tag_name: TAG, body: null })));

    const { result } = renderHook(() => useChangelog(TAG, REPO, true, REPO));

    await waitFor(() => expect(result.current.loadingChangelog).toBe(false));
    expect(result.current.changelog).toBeNull();
  });

  it("stops loading and logs when the request fails", async () => {
    server.use(http.get(RELEASE_URL, () => new Response("<html>oops</html>", { status: 502, headers: { "content-type": "text/html" } })));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useChangelog(TAG, REPO, true, REPO));

    await waitFor(() => expect(result.current.loadingChangelog).toBe(false));
    expect(result.current.changelog).toBeNull();
    expect(consoleError).toHaveBeenCalledWith("Failed to fetch changelog:", expect.any(Error));
  });
});
