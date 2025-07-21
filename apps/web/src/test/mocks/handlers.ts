import { http, HttpResponse } from "msw";

// Define handlers that will be used by default
export const handlers = [
  // Health check endpoint
  http.get("/api/health", () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Default handlers can be overridden in individual tests
];

// Factory functions for common API responses
export const apiHandlers = {
  // Success responses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  success: (path: string, data: any) => http.get(path, () => HttpResponse.json(data)),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  successPost: (path: string, responseData: any) => http.post(path, () => HttpResponse.json(responseData)),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  successPut: (path: string, responseData: any) => http.put(path, () => HttpResponse.json(responseData)),

  successDelete: (path: string) => http.delete(path, () => new HttpResponse(null, { status: 204 })),

  // Error responses
  error: (path: string, status: number, error: string, errorCode?: string, isRetryable?: boolean) =>
    http.get(path, () =>
      HttpResponse.json(
        {
          error,
          ...(errorCode && { errorCode }),
          ...(isRetryable !== undefined && { isRetryable }),
        },
        { status },
      ),
    ),

  unauthorized: (path: string) =>
    http.get(path, () =>
      HttpResponse.json(
        {
          error: "Authentication required",
          errorCode: "AUTH_REQUIRED",
        },
        { status: 401 },
      ),
    ),

  forbidden: (path: string) =>
    http.get(path, () =>
      HttpResponse.json(
        {
          error: "Insufficient permissions",
          errorCode: "FORBIDDEN",
        },
        { status: 403 },
      ),
    ),

  notFound: (path: string) =>
    http.get(path, () =>
      HttpResponse.json(
        {
          error: "Resource not found",
          errorCode: "NOT_FOUND",
        },
        { status: 404 },
      ),
    ),

  serverError: (path: string, isRetryable = true) =>
    http.get(path, () =>
      HttpResponse.json(
        {
          error: "Internal server error",
          errorCode: "SERVER_ERROR",
          isRetryable,
        },
        { status: 500 },
      ),
    ),

  // Network error (connection refused, timeout, etc.)
  networkError: (path: string) => http.get(path, () => HttpResponse.error()),
};

// Specific API endpoint handlers for common endpoints
export const weightHandlers = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getWeightData: (data: any) => http.get("/api/weight", () => HttpResponse.json(data)),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createWeight: (responseData: any) => http.post("/api/weight", () => HttpResponse.json(responseData)),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateWeight: (id: string, responseData: any) => http.put(`/api/weight/${id}`, () => HttpResponse.json(responseData)),

  deleteWeight: (id: string) => http.delete(`/api/weight/${id}`, () => new HttpResponse(null, { status: 204 })),
};

export const userHandlers = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getSettings: (settings: any) => http.get("/api/user/settings", () => HttpResponse.json(settings)),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSettings: (responseData: any) => http.put("/api/user/settings", () => HttpResponse.json(responseData)),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getProfile: (profile: any) => http.get("/api/user/profile", () => HttpResponse.json(profile)),
};

export const providerHandlers = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connectProvider: (provider: string, responseData: any) => http.post(`/api/providers/${provider}/connect`, () => HttpResponse.json(responseData)),

  disconnectProvider: (provider: string) => http.delete(`/api/providers/${provider}`, () => new HttpResponse(null, { status: 204 })),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  syncProvider: (provider: string, responseData: any) => http.post(`/api/providers/${provider}/sync`, () => HttpResponse.json(responseData)),
};
