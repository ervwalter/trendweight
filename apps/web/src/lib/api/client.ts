export class ApiError extends Error {
  status: number;
  errorCode?: string;
  isRetryable?: boolean;

  constructor(status: number, message: string, errorCode?: string, isRetryable?: boolean) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.isRetryable = isRetryable;
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  // Get the current session's access token from Clerk if authenticated
  let token: string | null = null;

  // @ts-expect-error - Clerk may not be initialized yet
  if (window.Clerk?.session) {
    try {
      // @ts-expect-error - Clerk session API
      token = await window.Clerk.session.getToken();
    } catch (error) {
      console.error("Failed to get Clerk token:", error);
    }
  }

  // Use a relative path for the API base URL to work with the Vite proxy
  const apiBaseUrl = "/api";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) || {}),
  };

  // Add Authorization header with Clerk JWT token if available
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Extract headers to handle them separately
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { headers: _customHeaders, ...optionsWithoutHeaders } = options || {};
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...optionsWithoutHeaders,
    headers,
  });

  if (!response.ok) {
    // Try to parse error response
    let errorMessage = `API request failed: ${response.statusText}`;
    let errorCode: string | undefined;
    let isRetryable: boolean | undefined;

    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
      if (errorData.errorCode) {
        errorCode = errorData.errorCode;
      }
      if (errorData.isRetryable !== undefined) {
        isRetryable = errorData.isRetryable;
      }
    } catch {
      // Ignore JSON parse errors, use default message
    }

    throw new ApiError(response.status, errorMessage, errorCode, isRetryable);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
