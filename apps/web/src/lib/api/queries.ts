import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useSyncProgress } from "@/components/dashboard/sync-progress/hooks";
import { useAuth, type GetToken } from "@/lib/auth/use-auth";
import type { ProfileData, SharingData } from "@/lib/core/interfaces";
import { getDemoData, getDemoProfile } from "@/lib/demo/demo-data";
import { ApiError, apiRequest } from "./client";
import type { MeasurementsResponse, ProfileResponse, ProviderLink } from "./types";

// Query key helpers
const createQueryKey = <T extends readonly unknown[]>(base: T, sharingCode?: string): T | readonly [string, ...T] => {
  return sharingCode ? ([sharingCode, ...base] as const) : base;
};

// Query keys
export const queryKeys = {
  profile: (sharingCode?: string) => createQueryKey(["profile"] as const, sharingCode),
  dashboardData: (sharingCode?: string) => createQueryKey(["data", "dashboard"] as const, sharingCode),
  downloadData: () => ["data", "download"] as const,
  providerLinks: (sharingCode?: string) => createQueryKey(["providerLinks"] as const, sharingCode),
  sharing: ["sharing"] as const,
  // Helper for invalidating all data queries
  allData: (sharingCode?: string) => createQueryKey(["data"] as const, sharingCode),
};

// Helper function to transform ProfileResponse to ProfileData
const selectProfileData = (data: ProfileResponse | null): ProfileData | null => {
  if (!data) return null;
  return {
    firstName: data.user.firstName,
    goalStart: data.user.goalStart,
    goalWeight: data.user.goalWeight,
    plannedPoundsPerWeek: data.user.plannedPoundsPerWeek,
    dayStartOffset: data.user.dayStartOffset,
    useMetric: data.user.useMetric,
    showCalories: data.user.showCalories,
    hideDataBeforeStart: data.user.hideDataBeforeStart,
    sharingToken: data.user.sharingToken,
    sharingEnabled: data.user.sharingEnabled,
    isMigrated: data.user.isMigrated,
    isNewlyMigrated: data.user.isNewlyMigrated,
  };
};

// Custom hook to wrap query options with progress lifecycle
function useWithProgress<T>(baseQueryOptions: T & { queryFn: () => Promise<unknown> }, progressMessage: string, shouldUseProgress: boolean = true): T {
  const { startProgress, endProgress } = useSyncProgress();

  if (!shouldUseProgress) {
    return baseQueryOptions;
  }

  return {
    ...baseQueryOptions,
    queryFn: async () => {
      // Start client-side progress immediately
      queueMicrotask(() => startProgress(progressMessage));

      try {
        // Call the original queryFn
        const result = await baseQueryOptions.queryFn();

        // End client-side progress after data loads
        // (only clears if no server progress received)
        endProgress();

        return result;
      } catch (error) {
        // Also end on error
        endProgress();
        throw error;
      }
    },
  } as T;
}

// Query options for reuse - now accepts getToken function
export const queryOptions = {
  profile: (getToken: GetToken, sharingCode?: string) => ({
    queryKey: queryKeys.profile(sharingCode),
    queryFn: async () => {
      try {
        const endpoint = sharingCode ? `/profile/${sharingCode}` : "/profile";
        const token = await getToken();
        return await apiRequest<ProfileResponse>(endpoint, { token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          // Return null for 404s (user exists but no profile yet)
          return null;
        }
        throw error;
      }
    },
    select: selectProfileData,
  }),
  dashboardData: (getToken: GetToken, opts?: { sharingCode?: string; progressId?: string }) => ({
    queryKey: queryKeys.dashboardData(opts?.sharingCode),
    queryFn: async () => {
      const basePath = opts?.sharingCode ? `/data/${opts.sharingCode}` : "/data";
      const params = new URLSearchParams();
      if (opts?.progressId) params.set("progressId", opts.progressId);
      const url = params.toString() ? `${basePath}?${params}` : basePath;
      const token = await getToken();
      return apiRequest<MeasurementsResponse>(url, { token });
    },
    staleTime: 60000, // 1 minute (matching legacy React Query config)
  }),
  downloadData: (getToken: GetToken, opts?: { progressId?: string }) => ({
    queryKey: queryKeys.downloadData(),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts?.progressId) params.set("progressId", opts.progressId);
      params.set("includeSource", "true");
      const url = `/data?${params}`;
      const token = await getToken();
      return apiRequest<MeasurementsResponse>(url, { token });
    },
    staleTime: 60000, // 1 minute (matching legacy React Query config)
  }),
  providerLinks: (getToken: GetToken, sharingCode?: string) => ({
    queryKey: queryKeys.providerLinks(sharingCode),
    queryFn: async () => {
      try {
        const endpoint = sharingCode ? `/providers/links/${sharingCode}` : "/providers/links";
        const token = await getToken();
        return await apiRequest<ProviderLink[]>(endpoint, { token });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          // Return empty array for 404s (no provider links yet)
          return [];
        }
        throw error;
      }
    },
  }),
  sharing: (getToken: GetToken) => ({
    queryKey: queryKeys.sharing,
    queryFn: async () => {
      const token = await getToken();
      return apiRequest<SharingData>("/sharing", { token });
    },
  }),
};

// Profile query (with suspense) - returns ProfileData
export function useProfile() {
  const { getToken } = useAuth();
  return useSuspenseQuery(queryOptions.profile(getToken));
}

// Combined profile and measurement data query with suspense (loads in parallel)
export function useDashboardQueries(sharingCode?: string) {
  const { getToken } = useAuth();
  const { progressId } = useSyncProgress();

  // Create demo query options that match the expected types
  const demoQueryOptions = {
    profile: {
      queryKey: ["demo-profile"] as const,
      queryFn: async (): Promise<ProfileResponse> => {
        const demoProfile = getDemoProfile();
        return {
          user: demoProfile,
          isMe: false,
          timestamp: new Date().toISOString(),
        };
      },
      select: selectProfileData,
    },
    data: {
      queryKey: ["demo-data"] as const,
      queryFn: async (): Promise<MeasurementsResponse> => ({
        ...getDemoData(),
        isMe: false,
      }),
    },
  };

  // Build the base data query options
  const dataQueryOptions = sharingCode === "demo" ? demoQueryOptions.data : queryOptions.dashboardData(getToken, { sharingCode, progressId });

  // Always call hook, but only apply progress for non-demo
  const enhancedDataQuery = useWithProgress(dataQueryOptions, "Getting updated data...", sharingCode !== "demo");

  // Determine which query options to use
  const queryOptionsToUse = {
    profile: sharingCode === "demo" ? demoQueryOptions.profile : queryOptions.profile(getToken, sharingCode),
    data: enhancedDataQuery,
  };

  // Always call the hook with consistent types
  const results = useSuspenseQueries({
    queries: [queryOptionsToUse.profile, queryOptionsToUse.data],
  });

  const profileResult = results[0];
  const dataResult = results[1];
  const measurementsResponse = dataResult.data as MeasurementsResponse;

  return {
    profile: profileResult.data,
    measurementData: measurementsResponse.computedMeasurements,
    sourceData: measurementsResponse.sourceData,
    providerStatus: measurementsResponse.providerStatus,
    profileError: profileResult.data === null ? new ApiError(404, "Profile not found") : null,
    isMe: measurementsResponse.isMe ?? true,
  };
}

// Provider links query
export function useProviderLinks() {
  const { getToken } = useAuth();
  return useSuspenseQuery(queryOptions.providerLinks(getToken));
}

// Sharing settings query
export function useSharingSettings() {
  const { getToken } = useAuth();
  return useSuspenseQuery(queryOptions.sharing(getToken));
}

// Download data query (includes source data for provider-specific downloads)
export function useDownloadData() {
  const { getToken } = useAuth();
  const { progressId } = useSyncProgress();

  // Build the base download query options
  const baseDownloadQuery = queryOptions.downloadData(getToken, { progressId });

  // Wrap with progress lifecycle
  const enhancedDownloadQuery = useWithProgress(baseDownloadQuery, "Getting download data...");

  const { data: measurementsResponse } = useSuspenseQuery(enhancedDownloadQuery);

  return {
    computedMeasurements: measurementsResponse.computedMeasurements,
    sourceData: measurementsResponse.sourceData,
    providerStatus: measurementsResponse.providerStatus,
    isMe: measurementsResponse.isMe ?? true,
  };
}
