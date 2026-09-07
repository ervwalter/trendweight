import { http, HttpResponse } from "msw";

// Define handlers that will be used by default
export const handlers = [
  // Health check endpoint
  http.get("/api/health", () => {
    return HttpResponse.json({ status: "ok" });
  }),

  // Default handlers can be overridden in individual tests
];
