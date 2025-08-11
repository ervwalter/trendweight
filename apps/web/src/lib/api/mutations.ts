import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./client";
import { queryKeys } from "./queries";
import type { ProfileResponse } from "./types";
import type { SharingData } from "../core/interfaces";

interface UpdateProfileData {
  firstName?: string;
  goalStart?: string;
  goalWeight?: number;
  plannedPoundsPerWeek?: number;
  dayStartOffset?: number;
  useMetric?: boolean;
  showCalories?: boolean;
  hideDataBeforeStart?: boolean;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileData) => {
      // Transform empty strings to undefined for proper API handling
      const cleanedData = {
        ...data,
        goalStart: data.goalStart === "" ? undefined : data.goalStart,
      };

      return apiRequest<ProfileResponse>("/profile", {
        method: "PUT",
        body: JSON.stringify(cleanedData),
      });
    },
    onSuccess: (data) => {
      // Update the cache with the new data
      queryClient.setQueryData(queryKeys.profile(), data);
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
    },
  });
}

export function useDisconnectProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => apiRequest(`/providers/${provider}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.providerLinks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.data() });
    },
  });
}

export function useEnableProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => apiRequest(`/providers/${provider}/enable`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.providerLinks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.data() });
    },
  });
}

export function useClearProviderData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (provider: string) => apiRequest(`/providers/${provider}/clear-data`, { method: "POST" }),
    onSuccess: () => {
      // Invalidate data query to refresh measurements after clearing
      queryClient.invalidateQueries({ queryKey: queryKeys.data() });
    },
  });
}

export function useReconnectProvider() {
  return useMutation({
    mutationFn: async (provider: string) => {
      const endpoint = provider === "fitbit" ? "/fitbit/link" : "/withings/link";
      return apiRequest<{ url?: string; authorizationUrl?: string }>(endpoint);
    },
  });
}

export function useToggleSharing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest<SharingData>("/sharing/toggle", {
        method: "POST",
        body: JSON.stringify({ enabled }),
      }),
    onMutate: async (enabled) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.sharing });

      // Snapshot the previous value
      const previousSharing = queryClient.getQueryData<SharingData>(queryKeys.sharing);

      // Optimistically update to the new value
      queryClient.setQueryData<SharingData>(queryKeys.sharing, (old) => ({
        sharingEnabled: enabled,
        sharingToken: old?.sharingToken,
      }));

      // Return a context object with the snapshotted value
      return { previousSharing };
    },
    onError: (_err, _enabled, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousSharing) {
        queryClient.setQueryData(queryKeys.sharing, context.previousSharing);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.sharing });
    },
  });
}

export function useGenerateShareToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest<SharingData>("/profile/generate-token", {
        method: "POST",
      }),
    onSuccess: (data) => {
      // Update the cache with the new data
      queryClient.setQueryData(queryKeys.sharing, data);
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.sharing });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => apiRequest("/profile", { method: "DELETE" }),
  });
}

interface ExchangeTokenRequest {
  code: string;
}

interface ExchangeTokenResponse {
  success: boolean;
  message: string;
}

export function useExchangeFitbitToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code }: ExchangeTokenRequest) =>
      apiRequest<ExchangeTokenResponse>("/fitbit/exchange-token", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    onSuccess: () => {
      // Invalidate provider links to show the new connection
      queryClient.invalidateQueries({ queryKey: queryKeys.providerLinks() });
    },
  });
}

export function useExchangeWithingsToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code }: ExchangeTokenRequest) =>
      apiRequest<ExchangeTokenResponse>("/withings/exchange-token", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    onSuccess: () => {
      // Invalidate provider links to show the new connection
      queryClient.invalidateQueries({ queryKey: queryKeys.providerLinks() });
    },
  });
}

export function useCompleteMigration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiRequest("/profile/complete-migration", {
        method: "POST",
      }),
    onSuccess: async () => {
      // Invalidate and refetch profile query to ensure the migration flag is updated
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      await queryClient.refetchQueries({ queryKey: queryKeys.profile() });
    },
  });
}
