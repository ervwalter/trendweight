import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Route } from "../../routes/oauth/withings/callback";
import { useExchangeWithingsToken } from "../../lib/api/mutations";
import { ApiError } from "../../lib/api/client";
import { OAuthCallbackUI } from "./OAuthCallbackUI";

export function WithingsCallback() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { code?: string; state?: string };
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 2;

  const exchangeTokenMutation = useExchangeWithingsToken();

  const handleTokenExchange = useCallback(() => {
    if (search.code && search.state) {
      exchangeTokenMutation.mutate(
        { code: search.code },
        {
          onSuccess: () => {
            setError(null); // Clear any previous error
            setErrorCode(null);
            setIsSuccess(true);
            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              navigate({ to: "/dashboard" });
            }, 3000);
          },
          onError: (error: Error) => {
            // Check if this is a retryable error and we haven't exceeded retry limit
            const isRetryable = error instanceof ApiError && error.isRetryable;
            const errorCode = error instanceof ApiError ? error.errorCode : null;

            if (isRetryable && retryCount < maxRetries) {
              setRetryCount((prev) => prev + 1);
              // Retry after a delay (exponential backoff)
              setTimeout(
                () => {
                  handleTokenExchange();
                },
                Math.pow(2, retryCount) * 1000,
              ); // 1s, 2s, 4s...
            } else {
              setError(error.message);
              setErrorCode(errorCode || null);
            }
          },
        },
      );
    }
  }, [search.code, search.state, exchangeTokenMutation, navigate, retryCount]);

  useEffect(() => {
    // Handle initial OAuth callback from Withings
    if (search.code && search.state && !exchangeTokenMutation.isPending && !isSuccess && !error) {
      handleTokenExchange();
    }
  }, [search.code, search.state, exchangeTokenMutation.isPending, isSuccess, error, handleTokenExchange]);

  // Determine UI state
  let uiState: "loading" | "success" | "error" | "invalid";
  if (exchangeTokenMutation.isPending || (!isSuccess && !error && search.code)) {
    uiState = "loading";
  } else if (isSuccess) {
    uiState = "success";
  } else if (error) {
    uiState = "error";
  } else {
    uiState = "invalid";
  }

  return (
    <OAuthCallbackUI providerName="Withings" state={uiState} error={error || undefined} errorCode={errorCode} retryCount={retryCount} maxRetries={maxRetries} />
  );
}
