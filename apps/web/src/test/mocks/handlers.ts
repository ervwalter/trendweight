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

  success: (path: string, data: any) => http.get(path, () => HttpResponse.json(data)),

  successPost: (path: string, responseData: any) => http.post(path, () => HttpResponse.json(responseData)),

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
  getWeightData: (data: any) => http.get("/api/weight", () => HttpResponse.json(data)),

  createWeight: (responseData: any) => http.post("/api/weight", () => HttpResponse.json(responseData)),

  updateWeight: (id: string, responseData: any) => http.put(`/api/weight/${id}`, () => HttpResponse.json(responseData)),

  deleteWeight: (id: string) => http.delete(`/api/weight/${id}`, () => new HttpResponse(null, { status: 204 })),
};

export const userHandlers = {
  getSettings: (settings: any) => http.get("/api/user/settings", () => HttpResponse.json(settings)),

  updateSettings: (responseData: any) => http.put("/api/user/settings", () => HttpResponse.json(responseData)),

  getProfile: (profile: any) => http.get("/api/user/profile", () => HttpResponse.json(profile)),
};

export const providerHandlers = {
  connectProvider: (provider: string, responseData: any) => http.post(`/api/providers/${provider}/connect`, () => HttpResponse.json(responseData)),

  disconnectProvider: (provider: string) => http.delete(`/api/providers/${provider}`, () => new HttpResponse(null, { status: 204 })),

  syncProvider: (provider: string, responseData: any) => http.post(`/api/providers/${provider}/sync`, () => HttpResponse.json(responseData)),
};
