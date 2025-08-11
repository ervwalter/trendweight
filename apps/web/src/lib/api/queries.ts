import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useContext } from "react";
import { SyncProgressContext } from "../../components/dashboard/sync-progress/context";
import type { ProfileData, SharingData } from "../core/interfaces";
import { getDemoData, getDemoProfile } from "../demo/demo-data";
import { ApiError, apiRequest } from "./client";
import type { MeasurementsResponse, ProfileResponse, ProviderLink } from "./types";

// Query key helpers
const createQueryKey = <T extends readonly unknown[]>(base: T, sharingCode?: string): T | readonly [...T, string] => {
  return sharingCode ? ([...base, sharingCode] as const) : base;
};

// Query keys
export const queryKeys = {
  profile: (sharingCode?: string) => createQueryKey(["profile"] as const, sharingCode),
  data: (sharingCode?: string) => createQueryKey(["data"] as const, sharingCode),
  providerLinks: (sharingCode?: string) => createQueryKey(["providerLinks"] as const, sharingCode),
  sharing: ["sharing"] as const,
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

// Query options for reuse
export const queryOptions = {
  profile: (sharingCode?: string) => ({
    queryKey: queryKeys.profile(sharingCode),
    queryFn: async () => {
      try {
        const endpoint = sharingCode ? `/profile/${sharingCode}` : "/profile";
        return await apiRequest<ProfileResponse>(endpoint);
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
  data: (opts?: { sharingCode?: string; progressId?: string }) => ({
    queryKey: queryKeys.data(opts?.sharingCode),
    queryFn: () => {
      const basePath = opts?.sharingCode ? `/data/${opts.sharingCode}` : "/data";
      const url = opts?.progressId ? `${basePath}?progressId=${opts.progressId}` : basePath;
      return apiRequest<MeasurementsResponse>(url);
    },
    staleTime: 60000, // 1 minute (matching legacy React Query config)
  }),
  providerLinks: (sharingCode?: string) => ({
    queryKey: queryKeys.providerLinks(sharingCode),
    queryFn: async () => {
      try {
        const endpoint = sharingCode ? `/providers/links/${sharingCode}` : "/providers/links";
        return await apiRequest<ProviderLink[]>(endpoint);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          // Return empty array for 404s (no provider links yet)
          return [];
        }
        throw error;
      }
    },
  }),
  sharing: {
    queryKey: queryKeys.sharing,
    queryFn: () => apiRequest<SharingData>("/sharing"),
  },
};

// Profile query (with suspense) - returns ProfileData
export function useProfile() {
  return useSuspenseQuery(queryOptions.profile());
}

// Combined profile and measurement data query with suspense (loads in parallel)
export function useDashboardQueries(sharingCode?: string) {
  // Try to get sync progress context if available
  const syncProgress = useContext(SyncProgressContext);
  const progressId = syncProgress?.progressId;
  const startProgress = syncProgress?.startProgress;
  const endProgress = syncProgress?.endProgress;
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
  const dataQueryOptions = sharingCode === "demo" ? demoQueryOptions.data : queryOptions.data({ sharingCode, progressId });

  // Wrap the queryFn to add progress lifecycle (not for demo, and only if context available)
  const enhancedDataQuery =
    sharingCode === "demo" || !startProgress || !endProgress
      ? dataQueryOptions
      : {
          ...dataQueryOptions,
          queryFn: async () => {
            // Start client-side progress immediately
            startProgress("Getting updated data...");

            try {
              // Call the original queryFn
              const result = await dataQueryOptions.queryFn();

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
        };

  // Determine which query options to use
  const queryOptionsToUse =
    sharingCode === "demo"
      ? {
          profile: demoQueryOptions.profile,
          data: enhancedDataQuery,
        }
      : {
          profile: queryOptions.profile(sharingCode),
          data: enhancedDataQuery,
        };

  // Always call the hook with consistent types
  const results = useSuspenseQueries({
    queries: [queryOptionsToUse.profile, queryOptionsToUse.data],
  });

  const profileResult = results[0];
  const dataResult = results[1];
  const measurementsResponse = dataResult.data;

  return {
    profile: profileResult.data,
    measurementData: measurementsResponse.data,
    providerStatus: measurementsResponse.providerStatus,
    profileError: profileResult.data === null ? new ApiError(404, "Profile not found") : null,
    isMe: measurementsResponse.isMe ?? true,
  };
}

// Provider links query
export function useProviderLinks() {
  return useSuspenseQuery(queryOptions.providerLinks());
}

// Sharing settings query
export function useSharingSettings() {
  return useSuspenseQuery(queryOptions.sharing);
}
