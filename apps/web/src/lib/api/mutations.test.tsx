import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import {
  useUpdateProfile,
  useDisconnectProvider,
  useClearProviderData,
  useReconnectProvider,
  useToggleSharing,
  useGenerateShareToken,
  useDeleteAccount,
  useExchangeFitbitToken,
  useExchangeWithingsToken,
  useEnableProvider,
} from "./mutations";
import { queryKeys } from "./queries";
import type { ProfileResponse } from "./types";
import type { SharingData } from "../core/interfaces";

// Mock useAuth hook
vi.mock("../auth/use-auth", () => ({
  useAuth: vi.fn(() => ({
    user: { uid: "test-user", email: "test@example.com", displayName: "Test User" },
    isLoaded: true,
    isLoggedIn: true,
    signOut: vi.fn(),
    getToken: vi.fn().mockResolvedValue("mock-token"),
  })),
}));

// Create wrapper for React Query
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useUpdateProfile", () => {
    it("should update profile successfully", async () => {
      const updatedProfile = {
        firstName: "Updated Name",
        useMetric: false,
        goalWeight: 75,
      };

      const mockResponse: ProfileResponse = {
        user: {
          firstName: "Updated Name",
          goalStart: "2024-01-01",
          goalWeight: 75,
          plannedPoundsPerWeek: 1,
          dayStartOffset: 4,
          useMetric: false,
          showCalories: false,
          sharingToken: "test-token",
          sharingEnabled: true,
        },
        timestamp: new Date().toISOString(),
        isMe: true,
      };

      server.use(
        http.put("/api/profile", async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(updatedProfile);
          return HttpResponse.json(mockResponse);
        }),
      );

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(updatedProfile);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should handle update profile error", async () => {
      server.use(
        http.put("/api/profile", () => {
          return HttpResponse.json({ error: "Failed to update profile" }, { status: 400 });
        }),
      );

      const { result } = renderHook(() => useUpdateProfile(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ firstName: "Test" });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it("should invalidate profile query on success", async () => {
      server.use(
        http.put("/api/profile", () => {
          return HttpResponse.json({ user: {} } as ProfileResponse);
        }),
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

      const { result } = renderHook(() => useUpdateProfile(), { wrapper });

      act(() => {
        result.current.mutate({ firstName: "Test" });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.profile(),
      });
    });
  });

  describe("useDisconnectProvider", () => {
    it("should disconnect provider successfully", async () => {
      const provider = "withings";

      server.use(
        http.delete(`/api/providers/${provider}`, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const { result } = renderHook(() => useDisconnectProvider(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(provider);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should invalidate queries on success", async () => {
      const provider = "fitbit";

      server.use(
        http.delete(`/api/providers/${provider}`, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

      const { result } = renderHook(() => useDisconnectProvider(), { wrapper });

      act(() => {
        result.current.mutate(provider);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.providerLinks(),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.data(),
      });
    });
  });

  describe("useEnableProvider", () => {
    it("should enable provider successfully", async () => {
      const provider = "legacy";

      server.use(
        http.post(`/api/providers/${provider}/enable`, () => {
          return HttpResponse.json({ message: "legacy enabled successfully" });
        }),
      );

      const { result } = renderHook(() => useEnableProvider(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(provider);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should invalidate queries on success", async () => {
      const provider = "legacy";

      server.use(
        http.post(`/api/providers/${provider}/enable`, () => {
          return HttpResponse.json({ message: "legacy enabled successfully" });
        }),
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

      const { result } = renderHook(() => useEnableProvider(), { wrapper });

      act(() => {
        result.current.mutate(provider);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.providerLinks(),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.data(),
      });
    });
  });

  describe("useClearProviderData", () => {
    it("should clear provider data successfully", async () => {
      const provider = "withings";

      server.use(
        http.post(`/api/providers/${provider}/clear-data`, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const { result } = renderHook(() => useClearProviderData(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(provider);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should invalidate data queries on success", async () => {
      const provider = "fitbit";

      server.use(
        http.post(`/api/providers/${provider}/clear-data`, () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

      const { result } = renderHook(() => useClearProviderData(), { wrapper });

      act(() => {
        result.current.mutate(provider);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.data(),
      });
    });
  });

  describe("useReconnectProvider", () => {
    it("should reconnect Fitbit provider", async () => {
      const provider = "fitbit";
      const mockResponse = { url: "https://fitbit.com/auth" };

      server.use(
        http.get("/api/fitbit/link", () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const { result } = renderHook(() => useReconnectProvider(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(provider);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should reconnect Withings provider", async () => {
      const provider = "withings";
      const mockResponse = { authorizationUrl: "https://withings.com/auth" };

      server.use(
        http.get("/api/withings/link", () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const { result } = renderHook(() => useReconnectProvider(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(provider);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });
  });

  describe("useToggleSharing", () => {
    it("should enable sharing successfully", async () => {
      const mockResponse: SharingData = {
        sharingEnabled: true,
        sharingToken: "new-token",
      };

      server.use(
        http.post("/api/sharing/toggle", async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ enabled: true });
          return HttpResponse.json(mockResponse);
        }),
      );

      const { result } = renderHook(() => useToggleSharing(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(true);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should disable sharing successfully", async () => {
      const mockResponse: SharingData = {
        sharingEnabled: false,
        sharingToken: undefined,
      };

      server.use(
        http.post("/api/sharing/toggle", async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ enabled: false });
          return HttpResponse.json(mockResponse);
        }),
      );

      const { result } = renderHook(() => useToggleSharing(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate(false);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should optimistically update sharing state", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Set initial data
      queryClient.setQueryData<SharingData>(queryKeys.sharing, {
        sharingEnabled: false,
        sharingToken: "old-token",
      });

      server.use(
        http.post("/api/sharing/toggle", () => {
          // Add a small delay to ensure we can check the optimistic update
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(
                HttpResponse.json({
                  sharingEnabled: true,
                  sharingToken: "old-token",
                }),
              );
            }, 50);
          });
        }),
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

      const { result } = renderHook(() => useToggleSharing(), { wrapper });

      await act(async () => {
        result.current.mutate(true);
      });

      // Check optimistic update immediately after mutation
      await waitFor(() => {
        const optimisticData = queryClient.getQueryData<SharingData>(queryKeys.sharing);
        expect(optimisticData?.sharingEnabled).toBe(true);
        expect(optimisticData?.sharingToken).toBe("old-token");
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should rollback on error", async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // Set initial data
      const initialData: SharingData = {
        sharingEnabled: false,
        sharingToken: "test-token",
      };
      queryClient.setQueryData<SharingData>(queryKeys.sharing, initialData);

      server.use(
        http.post("/api/sharing/toggle", () => {
          return HttpResponse.json({ error: "Failed to toggle sharing" }, { status: 500 });
        }),
      );

      const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

      const { result } = renderHook(() => useToggleSharing(), { wrapper });

      act(() => {
        result.current.mutate(true);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Check that data was rolled back
      const rolledBackData = queryClient.getQueryData<SharingData>(queryKeys.sharing);
      expect(rolledBackData).toEqual(initialData);
    });
  });

  describe("useGenerateShareToken", () => {
    it("should generate share token successfully", async () => {
      const mockResponse: SharingData = {
        sharingEnabled: true,
        sharingToken: "new-generated-token",
      };

      server.use(
        http.post("/api/profile/generate-token", () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const { result } = renderHook(() => useGenerateShareToken(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should update cache and invalidate on success", async () => {
      const mockResponse: SharingData = {
        sharingEnabled: true,
        sharingToken: "new-token",
      };

      server.use(
        http.post("/api/profile/generate-token", () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

      const { result } = renderHook(() => useGenerateShareToken(), { wrapper });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(setQueryDataSpy).toHaveBeenCalledWith(queryKeys.sharing, mockResponse);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.sharing,
      });
    });
  });

  describe("useDeleteAccount", () => {
    it("should delete account successfully", async () => {
      server.use(
        http.delete("/api/profile", () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const { result } = renderHook(() => useDeleteAccount(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });

    it("should handle delete account error", async () => {
      server.use(
        http.delete("/api/profile", () => {
          return HttpResponse.json({ error: "Cannot delete account with active subscriptions" }, { status: 400 });
        }),
      );

      const { result } = renderHook(() => useDeleteAccount(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useExchangeFitbitToken", () => {
    it("should exchange Fitbit token successfully", async () => {
      const code = "auth-code-123";
      const mockResponse = {
        success: true,
        message: "Successfully connected Fitbit account",
      };

      server.use(
        http.post("/api/fitbit/exchange-token", async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ code });
          return HttpResponse.json(mockResponse);
        }),
      );

      const { result } = renderHook(() => useExchangeFitbitToken(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ code });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should invalidate provider links on success", async () => {
      const code = "auth-code-123";

      server.use(
        http.post("/api/fitbit/exchange-token", () => {
          return HttpResponse.json({ success: true, message: "Connected" });
        }),
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

      const { result } = renderHook(() => useExchangeFitbitToken(), { wrapper });

      act(() => {
        result.current.mutate({ code });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.providerLinks(),
      });
    });

    it("should handle token exchange error", async () => {
      const code = "invalid-code";

      server.use(
        http.post("/api/fitbit/exchange-token", () => {
          return HttpResponse.json({ error: "Invalid authorization code" }, { status: 400 });
        }),
      );

      const { result } = renderHook(() => useExchangeFitbitToken(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ code });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe("useExchangeWithingsToken", () => {
    it("should exchange Withings token successfully", async () => {
      const code = "withings-auth-code";
      const mockResponse = {
        success: true,
        message: "Successfully connected Withings account",
      };

      server.use(
        http.post("/api/withings/exchange-token", async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({ code });
          return HttpResponse.json(mockResponse);
        }),
      );

      const { result } = renderHook(() => useExchangeWithingsToken(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ code });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
    });

    it("should invalidate provider links on success", async () => {
      const code = "withings-auth-code";

      server.use(
        http.post("/api/withings/exchange-token", () => {
          return HttpResponse.json({ success: true, message: "Connected" });
        }),
      );

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

      const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

      const { result } = renderHook(() => useExchangeWithingsToken(), { wrapper });

      act(() => {
        result.current.mutate({ code });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.providerLinks(),
      });
    });
  });
});
