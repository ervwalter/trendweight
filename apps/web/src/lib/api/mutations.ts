import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/use-auth";
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
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      // Transform empty strings to undefined for proper API handling
      const cleanedData = {
        ...data,
        goalStart: data.goalStart === "" ? undefined : data.goalStart,
      };

      const token = await getToken();
      return apiRequest<ProfileResponse>("/profile", {
        method: "PUT",
        body: JSON.stringify(cleanedData),
        token,
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
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: string) => {
      const token = await getToken();
      return apiRequest(`/providers/${provider}`, { method: "DELETE", token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.providerLinks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.data() });
    },
  });
}

export function useEnableProvider() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: string) => {
      const token = await getToken();
      return apiRequest(`/providers/${provider}/enable`, { method: "POST", token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.providerLinks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.data() });
    },
  });
}

export function useClearProviderData() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (provider: string) => {
      const token = await getToken();
      return apiRequest(`/providers/${provider}/clear-data`, { method: "POST", token });
    },
    onSuccess: () => {
      // Invalidate data query to refresh measurements after clearing
      queryClient.invalidateQueries({ queryKey: queryKeys.data() });
    },
  });
}

export function useReconnectProvider() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (provider: string) => {
      const endpoint = provider === "fitbit" ? "/fitbit/link" : "/withings/link";
      const token = await getToken();
      return apiRequest<{ url?: string; authorizationUrl?: string }>(endpoint, { token });
    },
  });
}

export function useToggleSharing() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const token = await getToken();
      return apiRequest<SharingData>("/sharing/toggle", {
        method: "POST",
        body: JSON.stringify({ enabled }),
        token,
      });
    },
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
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiRequest<SharingData>("/profile/generate-token", {
        method: "POST",
        token,
      });
    },
    onSuccess: (data) => {
      // Update the cache with the new data
      queryClient.setQueryData(queryKeys.sharing, data);
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.sharing });
    },
  });
}

export function useDeleteAccount() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiRequest("/profile", { method: "DELETE", token });
    },
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
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code }: ExchangeTokenRequest) => {
      const token = await getToken();
      return apiRequest<ExchangeTokenResponse>("/fitbit/exchange-token", {
        method: "POST",
        body: JSON.stringify({ code }),
        token,
      });
    },
    onSuccess: () => {
      // Invalidate provider links to show the new connection
      queryClient.invalidateQueries({ queryKey: queryKeys.providerLinks() });
    },
  });
}

export function useExchangeWithingsToken() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code }: ExchangeTokenRequest) => {
      const token = await getToken();
      return apiRequest<ExchangeTokenResponse>("/withings/exchange-token", {
        method: "POST",
        body: JSON.stringify({ code }),
        token,
      });
    },
    onSuccess: () => {
      // Invalidate provider links to show the new connection
      queryClient.invalidateQueries({ queryKey: queryKeys.providerLinks() });
    },
  });
}

export function useCompleteMigration() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getToken();
      return apiRequest("/profile/complete-migration", {
        method: "POST",
        token,
      });
    },
    onSuccess: async () => {
      // Invalidate and refetch profile query to ensure the migration flag is updated
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
      await queryClient.refetchQueries({ queryKey: queryKeys.profile() });
    },
  });
}
