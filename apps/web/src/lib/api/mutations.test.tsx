import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SharingData } from "@/lib/core/interfaces";
import { mockAuth } from "@/test/auth";
import { buildApiKeyMetadata, buildGeneratedApiKey, buildMeasurementsResponse, buildProfileResponse, buildProviderLink } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json, noContent, recordRequests } from "@/test/msw";
import { createTestQueryClient } from "@/test/query-client";
import { createQueryWrapper } from "@/test/render";
import { ApiError } from "./client";
import {
  useClearProviderData,
  useCompleteMigration,
  useDeleteAccount,
  useDeleteAllManualReadings,
  useDeleteManualReading,
  useDisconnectProvider,
  useEnableProvider,
  useExchangeFitbitToken,
  useExchangeWithingsToken,
  useGenerateApiKey,
  useGenerateShareToken,
  useReconnectProvider,
  useRevokeApiKey,
  useSaveManualReading,
  useToggleSharing,
  useUpdateProfile,
} from "./mutations";
import { queryKeys, useProfile } from "./queries";

vi.mock("@/lib/auth/use-auth");

const BEARER = "Bearer test-token";

// Seeds a cache entry that stays put for the rest of the test. The test client garbage-collects
// unobserved entries straight away (gcTime 0), which would otherwise drop the seed before the
// mutation's cache effects can be inspected.
function seedQuery<T>(queryClient: QueryClient, queryKey: QueryKey, data: T) {
  queryClient.setQueryDefaults(queryKey, { gcTime: Infinity });
  queryClient.setQueryData(queryKey, data);
}

function isInvalidated(queryClient: QueryClient, queryKey: QueryKey) {
  return queryClient.getQueryState(queryKey)?.isInvalidated;
}

// A promise the test releases by hand, so a handler can hold its response until the test has
// inspected the in-flight state.
function gate() {
  let release!: () => void;
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { opened, release };
}

describe("mutations", () => {
  beforeEach(() => {
    mockAuth();
  });

  describe("useUpdateProfile", () => {
    it("PUTs the changes with the bearer token and returns the updated profile", async () => {
      const changes = { firstName: "Sam", goalStart: "2024-02-01", goalWeight: 72, useMetric: false };
      const response = buildProfileResponse({ user: changes });
      server.use(http.put("/api/profile", () => json(200, response)));
      const requests = recordRequests();

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate(changes));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(response);
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "PUT", path: "/api/profile", headers: expect.objectContaining({ authorization: BEARER }), body: changes });
    });

    it("omits goalStart from the body when it has been cleared", async () => {
      server.use(http.put("/api/profile", () => json(200, buildProfileResponse({ user: { goalStart: undefined } }))));
      const requests = recordRequests();

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate({ firstName: "Sam", goalStart: "" }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [call] = await requests.settled();
      const body = call.body as Record<string, unknown>;
      expect("goalStart" in body).toBe(false);
      expect(body).toEqual({ firstName: "Sam" });
    });

    it("stores the response under the profile key and invalidates profile and data queries", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.profile(), buildProfileResponse());
      seedQuery(queryClient, queryKeys.allData(), buildMeasurementsResponse());
      seedQuery(queryClient, queryKeys.sharing, { sharingEnabled: true, sharingToken: "share-1" } satisfies SharingData);
      const response = buildProfileResponse({ user: { firstName: "Sam" } });
      server.use(http.put("/api/profile", () => json(200, response)));

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate({ firstName: "Sam" }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(queryClient.getQueryData(queryKeys.profile())).toEqual(response);
      expect(isInvalidated(queryClient, queryKeys.profile())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.allData())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.sharing)).toBe(false);
    });

    it("rejects with an ApiError carrying the server's status, message and code", async () => {
      server.use(http.put("/api/profile", () => json(400, { error: "First name is required", errorCode: "VALIDATION_ERROR" })));

      const { result } = renderHook(() => useUpdateProfile(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate({ firstName: "" }));

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect(result.current.error).toMatchObject({ status: 400, message: "First name is required", errorCode: "VALIDATION_ERROR" });
    });
  });

  describe("useDisconnectProvider", () => {
    it("DELETEs the provider link with the bearer token and invalidates provider links and data", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.providerLinks(), [buildProviderLink("withings")]);
      seedQuery(queryClient, queryKeys.allData(), buildMeasurementsResponse());
      seedQuery(queryClient, queryKeys.sharing, { sharingEnabled: false } satisfies SharingData);
      server.use(http.delete("/api/providers/withings", () => noContent()));
      const requests = recordRequests();

      const { result } = renderHook(() => useDisconnectProvider(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate("withings"));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "DELETE", path: "/api/providers/withings", headers: expect.objectContaining({ authorization: BEARER }) });
      expect(isInvalidated(queryClient, queryKeys.providerLinks())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.allData())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.sharing)).toBe(false);
    });
  });

  describe("useEnableProvider", () => {
    it("POSTs the enable request with the bearer token and invalidates provider links and data", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.providerLinks(), [buildProviderLink("legacy", { isDisabled: true })]);
      seedQuery(queryClient, queryKeys.allData(), buildMeasurementsResponse());
      server.use(http.post("/api/providers/legacy/enable", () => json(200, { message: "legacy enabled successfully" })));
      const requests = recordRequests();

      const { result } = renderHook(() => useEnableProvider(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate("legacy"));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "POST", path: "/api/providers/legacy/enable", headers: expect.objectContaining({ authorization: BEARER }) });
      expect(isInvalidated(queryClient, queryKeys.providerLinks())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.allData())).toBe(true);
    });
  });

  describe("useClearProviderData", () => {
    it("POSTs the clear request with the bearer token and invalidates only the data queries", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.providerLinks(), [buildProviderLink("withings")]);
      seedQuery(queryClient, queryKeys.allData(), buildMeasurementsResponse());
      server.use(http.post("/api/providers/withings/clear-data", () => noContent()));
      const requests = recordRequests();

      const { result } = renderHook(() => useClearProviderData(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate("withings"));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "POST", path: "/api/providers/withings/clear-data", headers: expect.objectContaining({ authorization: BEARER }) });
      expect(isInvalidated(queryClient, queryKeys.allData())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.providerLinks())).toBe(false);
    });
  });

  describe("useReconnectProvider", () => {
    it.each([
      ["withings", "/api/withings/link"],
      ["fitbit", "/api/fitbit/link"],
    ])("GETs the %s authorization URL with the bearer token", async (provider, path) => {
      const response = { authorizationUrl: `https://${provider}.example/auth` };
      server.use(http.get(path, () => json(200, response)));
      const requests = recordRequests();

      const { result } = renderHook(() => useReconnectProvider(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate(provider));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(response);
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "GET", path, headers: expect.objectContaining({ authorization: BEARER }) });
    });
  });

  describe("useSaveManualReading", () => {
    it("PUTs the reading keyed by date and invalidates readings, data, and provider links", async () => {
      const reading = { date: "2024-05-01", weight: 81.5, fatRatio: 0.22 };
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.manualReadings(), []);
      seedQuery(queryClient, queryKeys.allData(), buildMeasurementsResponse());
      seedQuery(queryClient, queryKeys.providerLinks(), []);
      server.use(http.put("/api/measurements/manual/2024-05-01", () => json(200, reading)));
      const requests = recordRequests();

      const { result } = renderHook(() => useSaveManualReading(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate(reading));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(reading);
      const [call] = await requests.settled();
      // The date travels in the URL, not the body
      expect(call).toMatchObject({
        method: "PUT",
        path: "/api/measurements/manual/2024-05-01",
        headers: expect.objectContaining({ authorization: BEARER }),
        body: { weight: 81.5, fatRatio: 0.22 },
      });
      expect(isInvalidated(queryClient, queryKeys.manualReadings())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.allData())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.providerLinks())).toBe(true);
    });
  });

  describe("useDeleteManualReading", () => {
    it("DELETEs the reading by date and invalidates readings, data, and provider links", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.manualReadings(), [{ date: "2024-05-01", weight: 81.5 }]);
      seedQuery(queryClient, queryKeys.allData(), buildMeasurementsResponse());
      seedQuery(queryClient, queryKeys.providerLinks(), []);
      server.use(http.delete("/api/measurements/manual/2024-05-01", () => noContent()));
      const requests = recordRequests();

      const { result } = renderHook(() => useDeleteManualReading(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate("2024-05-01"));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [call] = await requests.settled();
      expect(call).toMatchObject({
        method: "DELETE",
        path: "/api/measurements/manual/2024-05-01",
        headers: expect.objectContaining({ authorization: BEARER }),
      });
      expect(isInvalidated(queryClient, queryKeys.manualReadings())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.allData())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.providerLinks())).toBe(true);
    });
  });

  describe("useDeleteAllManualReadings", () => {
    it("DELETEs every reading and invalidates readings, data, and provider links", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.manualReadings(), [{ date: "2024-05-01", weight: 81.5 }]);
      seedQuery(queryClient, queryKeys.allData(), buildMeasurementsResponse());
      seedQuery(queryClient, queryKeys.providerLinks(), []);
      server.use(http.delete("/api/measurements/manual", () => noContent()));
      const requests = recordRequests();

      const { result } = renderHook(() => useDeleteAllManualReadings(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "DELETE", path: "/api/measurements/manual", headers: expect.objectContaining({ authorization: BEARER }) });
      expect(isInvalidated(queryClient, queryKeys.manualReadings())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.allData())).toBe(true);
      expect(isInvalidated(queryClient, queryKeys.providerLinks())).toBe(true);
    });
  });

  describe("useToggleSharing", () => {
    it.each([true, false])("POSTs enabled=%s with the bearer token and returns the new sharing state", async (enabled) => {
      const response: SharingData = { sharingEnabled: enabled, sharingToken: enabled ? "new-token" : undefined };
      server.use(http.post("/api/sharing/toggle", () => json(200, response)));
      const requests = recordRequests();

      const { result } = renderHook(() => useToggleSharing(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate(enabled));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(response);
      const [call] = await requests.settled();
      expect(call).toMatchObject({
        method: "POST",
        path: "/api/sharing/toggle",
        headers: expect.objectContaining({ authorization: BEARER }),
        body: { enabled },
      });
    });

    it("applies the new state optimistically while the request is in flight, keeping the token", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.sharing, { sharingEnabled: false, sharingToken: "old-token" } satisfies SharingData);
      const response = gate();
      server.use(
        http.post("/api/sharing/toggle", async () => {
          await response.opened;
          return json(200, { sharingEnabled: true, sharingToken: "old-token" } satisfies SharingData);
        }),
      );

      const { result } = renderHook(() => useToggleSharing(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate(true));

      await waitFor(() => expect(queryClient.getQueryData(queryKeys.sharing)).toEqual({ sharingEnabled: true, sharingToken: "old-token" }));
      expect(result.current.isPending).toBe(true);

      response.release();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(isInvalidated(queryClient, queryKeys.sharing)).toBe(true);
    });

    it("restores the previous sharing state when the server fails", async () => {
      const queryClient = createTestQueryClient();
      const previous: SharingData = { sharingEnabled: false, sharingToken: "old-token" };
      seedQuery(queryClient, queryKeys.sharing, previous);
      const response = gate();
      server.use(
        http.post("/api/sharing/toggle", async () => {
          await response.opened;
          return json(500, { error: "Failed to toggle sharing", errorCode: "SHARING_ERROR" });
        }),
      );

      const { result } = renderHook(() => useToggleSharing(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate(true));

      await waitFor(() => expect(queryClient.getQueryData<SharingData>(queryKeys.sharing)?.sharingEnabled).toBe(true));
      response.release();

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(queryClient.getQueryData(queryKeys.sharing)).toEqual(previous);
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect(result.current.error).toMatchObject({ status: 500, message: "Failed to toggle sharing", errorCode: "SHARING_ERROR" });
    });
  });

  describe("useGenerateShareToken", () => {
    it("POSTs with the bearer token, stores the new sharing data and invalidates it", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.sharing, { sharingEnabled: true, sharingToken: "old-token" } satisfies SharingData);
      const response: SharingData = { sharingEnabled: true, sharingToken: "new-generated-token" };
      server.use(http.post("/api/profile/generate-token", () => json(200, response)));
      const requests = recordRequests();

      const { result } = renderHook(() => useGenerateShareToken(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(response);
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "POST", path: "/api/profile/generate-token", headers: expect.objectContaining({ authorization: BEARER }) });
      expect(queryClient.getQueryData(queryKeys.sharing)).toEqual(response);
      expect(isInvalidated(queryClient, queryKeys.sharing)).toBe(true);
    });
  });

  describe("useGenerateApiKey", () => {
    it("POSTs with the bearer token, returns the key once and caches only its metadata", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.apiKey(), { exists: false });
      const generated = buildGeneratedApiKey();
      server.use(http.post("/api/profile/api-key", () => json(200, generated)));
      const requests = recordRequests();

      const { result } = renderHook(() => useGenerateApiKey(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(generated);
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "POST", path: "/api/profile/api-key", headers: expect.objectContaining({ authorization: BEARER }) });
      expect(queryClient.getQueryData(queryKeys.apiKey())).toEqual({ exists: true, suffix: generated.suffix, createdAt: generated.createdAt });
      const cachedData = JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.state.data),
      );
      expect(cachedData).not.toContain(generated.apiKey);
    });
  });

  describe("useRevokeApiKey", () => {
    it("DELETEs the key with the bearer token, marks it absent and invalidates the metadata", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.apiKey(), buildApiKeyMetadata());
      server.use(http.delete("/api/profile/api-key", () => noContent()));
      const requests = recordRequests();

      const { result } = renderHook(() => useRevokeApiKey(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "DELETE", path: "/api/profile/api-key", headers: expect.objectContaining({ authorization: BEARER }) });
      expect(queryClient.getQueryData(queryKeys.apiKey())).toEqual({ exists: false });
      expect(isInvalidated(queryClient, queryKeys.apiKey())).toBe(true);
    });
  });

  describe("useDeleteAccount", () => {
    it("DELETEs the profile with the bearer token", async () => {
      server.use(http.delete("/api/profile", () => noContent()));
      const requests = recordRequests();

      const { result } = renderHook(() => useDeleteAccount(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [call] = await requests.settled();
      expect(call).toMatchObject({ method: "DELETE", path: "/api/profile", headers: expect.objectContaining({ authorization: BEARER }) });
    });

    it("rejects with an ApiError when the server refuses", async () => {
      server.use(http.delete("/api/profile", () => json(400, { error: "Cannot delete account with active subscriptions", errorCode: "ACCOUNT_ACTIVE" })));

      const { result } = renderHook(() => useDeleteAccount(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate());

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect(result.current.error).toMatchObject({ status: 400, message: "Cannot delete account with active subscriptions", errorCode: "ACCOUNT_ACTIVE" });
    });
  });

  describe("useExchangeFitbitToken", () => {
    it("should exchange Fitbit token successfully", async () => {
      const code = "auth-code-123";
      const state = "signed-oauth-state";
      const mockResponse = {
        success: true,
        message: "Successfully connected Fitbit account",
      };
      server.use(http.post("/api/fitbit/exchange-token", () => json(200, mockResponse)));
      const requests = recordRequests();

      const { result } = renderHook(() => useExchangeFitbitToken(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate({ code, state }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockResponse);
      const [call] = await requests.settled();
      expect(call.body).toEqual({ code, state });
    });

    it("should invalidate provider links on success", async () => {
      const code = "auth-code-123";
      const state = "signed-oauth-state";
      server.use(http.post("/api/fitbit/exchange-token", () => json(200, { success: true, message: "Connected" })));
      const queryClient = createTestQueryClient();
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const { result } = renderHook(() => useExchangeFitbitToken(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate({ code, state }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.providerLinks() });
    });

    it("should handle token exchange error", async () => {
      const code = "invalid-code";
      const state = "signed-oauth-state";
      server.use(http.post("/api/fitbit/exchange-token", () => json(400, { error: "Invalid authorization code" })));

      const { result } = renderHook(() => useExchangeFitbitToken(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate({ code, state }));

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeDefined();
    });
  });

  describe("useExchangeWithingsToken", () => {
    it("POSTs the code and state with the bearer token and invalidates provider links", async () => {
      const queryClient = createTestQueryClient();
      seedQuery(queryClient, queryKeys.providerLinks(), []);
      const response = { success: true, message: "Successfully connected Withings account" };
      server.use(http.post("/api/withings/exchange-token", () => json(200, response)));
      const requests = recordRequests();

      const { result } = renderHook(() => useExchangeWithingsToken(), { wrapper: createQueryWrapper(queryClient) });
      act(() => result.current.mutate({ code: "withings-auth-code", state: "signed-oauth-state" }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(response);
      const [call] = await requests.settled();
      expect(call).toMatchObject({
        method: "POST",
        path: "/api/withings/exchange-token",
        headers: expect.objectContaining({ authorization: BEARER }),
        body: { code: "withings-auth-code", state: "signed-oauth-state" },
      });
      expect(isInvalidated(queryClient, queryKeys.providerLinks())).toBe(true);
    });

    it("rejects with an ApiError when the exchange fails", async () => {
      server.use(http.post("/api/withings/exchange-token", () => json(400, { error: "Invalid authorization code", errorCode: "OAUTH_ERROR" })));

      const { result } = renderHook(() => useExchangeWithingsToken(), { wrapper: createQueryWrapper(createTestQueryClient()) });
      act(() => result.current.mutate({ code: "bad", state: "signed-oauth-state" }));

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(ApiError);
      expect(result.current.error).toMatchObject({ status: 400, message: "Invalid authorization code", errorCode: "OAUTH_ERROR" });
    });
  });

  describe("useCompleteMigration", () => {
    it("POSTs the completion with the bearer token and refetches the profile so the flag clears", async () => {
      let migrated = false;
      server.use(
        http.get("/api/profile", () => json(200, buildProfileResponse({ user: { isNewlyMigrated: !migrated } }))),
        http.post("/api/profile/complete-migration", () => {
          migrated = true;
          return noContent();
        }),
      );
      const requests = recordRequests();

      const { result } = renderHook(() => ({ profile: useProfile(), completeMigration: useCompleteMigration() }), {
        wrapper: createQueryWrapper(createTestQueryClient()),
      });
      await waitFor(() => expect(result.current.profile.data?.isNewlyMigrated).toBe(true));

      act(() => result.current.completeMigration.mutate());

      await waitFor(() => expect(result.current.completeMigration.isSuccess).toBe(true));
      expect(result.current.profile.data?.isNewlyMigrated).toBe(false);
      const calls = await requests.settled();
      expect(calls[0]).toMatchObject({ method: "GET", path: "/api/profile" });
      expect(calls[1]).toMatchObject({ method: "POST", path: "/api/profile/complete-migration", headers: expect.objectContaining({ authorization: BEARER }) });
      const refetches = calls.slice(2);
      expect(refetches.length).toBeGreaterThanOrEqual(1);
      expect(refetches.every((call) => call.method === "GET" && call.path === "/api/profile" && call.headers.authorization === BEARER)).toBe(true);
    });
  });
});
