import { http, HttpResponse } from "msw";

// Define handlers that will be used by default
export const handlers = [
  // Health check endpoint
  http.get("/api/health", () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Default handlers can be overridden in individual tests
];

// Factory functions for common API error responses
export const apiHandlers = {
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

  // Network error (connection refused, timeout, etc.)
  networkError: (path: string) => http.get(path, () => HttpResponse.error()),
};
