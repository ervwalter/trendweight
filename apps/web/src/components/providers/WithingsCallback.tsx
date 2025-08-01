import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Route } from "../../routes/oauth/withings/callback";
import { useExchangeWithingsToken } from "../../lib/api/mutations";
import { ApiError } from "../../lib/api/client";
import { OAuthCallbackUI } from "./OAuthCallbackUI";

export function WithingsCallback() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { code?: string; state?: string };

  const exchangeTokenMutation = useExchangeWithingsToken();
  const { status, mutate, isSuccess, isPending, isError, error } = exchangeTokenMutation;

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
    // Handle initial OAuth callback from Withings
    // Only run if we have a code and the mutation hasn't been called yet
    if (search.code && search.state && status === "idle") {
      mutate({ code: search.code });
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
  } else if (search.code) {
    // We have a code but haven't started the mutation yet
    uiState = "loading";
  } else {
    uiState = "invalid";
  }

  const errorMessage = error instanceof Error ? error.message : undefined;
  const errorCode = error instanceof ApiError ? error.errorCode : null;

  return <OAuthCallbackUI providerName="Withings" state={uiState} error={errorMessage} errorCode={errorCode} />;
}
