import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useExchangeFitbitToken, useExchangeWithingsToken } from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/client";
import type { OAuthCallbackSearch } from "@/lib/routes/oauth-callback-search";
import { OAuthCallbackUI } from "./oauth-callback-ui";

export type OAuthProvider = "fitbit" | "withings";

const providerNames: Record<OAuthProvider, string> = { fitbit: "Fitbit", withings: "Withings" };
const exchangeHooks: Record<OAuthProvider, typeof useExchangeFitbitToken> = {
  fitbit: useExchangeFitbitToken,
  withings: useExchangeWithingsToken,
};

interface OAuthCallbackProps {
  provider: OAuthProvider;
  /** The validated `code` and `state` search params from the provider's callback route */
  search: OAuthCallbackSearch;
}

/** Exchanges the one-time OAuth code for the given provider and shows the outcome */
export function OAuthCallback({ provider, search }: OAuthCallbackProps) {
  const navigate = useNavigate();

  const exchangedCode = useRef<string | null>(null);
  // A callback route renders a single provider for its whole life, so the hook choice is stable
  const useExchangeToken = exchangeHooks[provider];
  const { status, mutate, isSuccess, isPending, isError, error } = useExchangeToken();

  // Redirect on success
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, navigate]);

  useEffect(() => {
    // Handle the initial OAuth callback from the provider.
    // Only run if we have a code and the mutation hasn't been called yet
    if (search.code && search.state && status === "idle" && exchangedCode.current !== search.code) {
      exchangedCode.current = search.code;
      mutate({ code: search.code, state: search.state });
    }
  }, [search.code, search.state, status, mutate]);

  // Determine UI state
  let uiState: "loading" | "success" | "error" | "invalid";
  if (isPending) {
    uiState = "loading";
  } else if (isSuccess) {
    uiState = "success";
  } else if (isError) {
    uiState = "error";
  } else if (search.code && search.state) {
    // We have a code but haven't started the mutation yet
    uiState = "loading";
  } else {
    uiState = "invalid";
  }

  const errorMessage = error instanceof Error ? error.message : undefined;
  const errorCode = error instanceof ApiError ? error.errorCode : null;

  return <OAuthCallbackUI providerName={providerNames[provider]} state={uiState} error={errorMessage} errorCode={errorCode} />;
}
