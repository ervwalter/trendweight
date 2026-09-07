import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/mocks/server";
import { apiRequest, ApiError } from "./client";
import { apiHandlers } from "@/test/mocks/handlers";

// No longer need to mock window.Clerk since we pass tokens directly

describe("api/client with MSW", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ApiError", () => {
    it("should create error with all properties", () => {
      const error = new ApiError(404, "Not found", "RESOURCE_NOT_FOUND", true);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ApiError");
      expect(error.message).toBe("Not found");
      expect(error.status).toBe(404);
      expect(error.errorCode).toBe("RESOURCE_NOT_FOUND");
      expect(error.isRetryable).toBe(true);
    });

    it("should create error with minimal properties", () => {
      const error = new ApiError(500, "Server error");

      expect(error.status).toBe(500);
      expect(error.message).toBe("Server error");
      expect(error.errorCode).toBeUndefined();
      expect(error.isRetryable).toBeUndefined();
    });
  });

  describe("apiRequest", () => {
    it("should make successful request without authentication", async () => {
      const mockResponse = { data: "test" };

      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await apiRequest<typeof mockResponse>("/test");

      expect(result).toEqual(mockResponse);
    });

    it("should include auth token when provided", async () => {
      const mockToken = "test-jwt-token";
      const mockResponse = { data: "authenticated" };

      // Use MSW to verify the authorization header
      let receivedHeaders: Headers | undefined;
      server.use(
        http.get("/api/protected", ({ request }) => {
          receivedHeaders = request.headers;
          return HttpResponse.json(mockResponse);
        }),
      );

      await apiRequest("/protected", { token: mockToken });

      expect(receivedHeaders?.get("Authorization")).toBe(`Bearer ${mockToken}`);
    });

    it("should work without token when none provided", async () => {
      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json({ data: "test" });
        }),
      );

      const result = await apiRequest("/test");

      expect(result).toEqual({ data: "test" });
    });

    it("should merge custom headers with defaults", async () => {
      let receivedHeaders: Headers | undefined;
      server.use(
        http.get("/api/test", ({ request }) => {
          receivedHeaders = request.headers;
          return HttpResponse.json({});
        }),
      );

      await apiRequest("/test", {
        headers: {
          "X-Custom-Header": "custom-value",
        },
      });

      expect(receivedHeaders?.get("Content-Type")).toBe("application/json");
      expect(receivedHeaders?.get("X-Custom-Header")).toBe("custom-value");
    });

    it("should pass through request options", async () => {
      let receivedBody: unknown;
      let receivedMethod: string | undefined;

      server.use(
        http.post("/api/test", async ({ request }) => {
          receivedMethod = request.method;
          receivedBody = await request.json();
          return HttpResponse.json({ success: true });
        }),
      );

      await apiRequest("/test", {
        method: "POST",
        body: JSON.stringify({ name: "test" }),
      });

      expect(receivedMethod).toBe("POST");
      expect(receivedBody).toEqual({ name: "test" });
    });

    it("should throw ApiError on failed request with JSON error response", async () => {
      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json(
            {
              error: "Invalid input data",
              errorCode: "VALIDATION_ERROR",
              isRetryable: false,
            },
            { status: 400 },
          );
        }),
      );

      await expect(apiRequest("/test")).rejects.toMatchObject({
        name: "ApiError",
        status: 400,
        message: "Invalid input data",
        errorCode: "VALIDATION_ERROR",
        isRetryable: false,
      });
    });

    it("should handle non-JSON error response", async () => {
      server.use(
        http.get("/api/test", () => {
          return new HttpResponse("Internal Server Error", {
            status: 500,
            headers: {
              "Content-Type": "text/plain",
            },
          });
        }),
      );

      await expect(apiRequest("/test")).rejects.toMatchObject({
        name: "ApiError",
        status: 500,
        message: "API request failed: Internal Server Error",
        errorCode: undefined,
        isRetryable: undefined,
      });
    });

    it("should handle 401 unauthorized errors", async () => {
      server.use(apiHandlers.unauthorized("/api/protected"));

      await expect(apiRequest("/protected")).rejects.toMatchObject({
        name: "ApiError",
        status: 401,
        message: "Authentication required",
        errorCode: "AUTH_REQUIRED",
      });
    });

    it("should handle 403 forbidden errors", async () => {
      server.use(apiHandlers.forbidden("/api/admin"));

      await expect(apiRequest("/admin")).rejects.toMatchObject({
        name: "ApiError",
        status: 403,
        message: "Insufficient permissions",
        errorCode: "FORBIDDEN",
      });
    });

    it("should handle 404 not found errors", async () => {
      server.use(apiHandlers.notFound("/api/missing"));

      await expect(apiRequest("/missing")).rejects.toMatchObject({
        name: "ApiError",
        status: 404,
        message: "Resource not found",
        errorCode: "NOT_FOUND",
      });
    });

    it("should handle 500 server errors with retry flag", async () => {
      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json(
            {
              error: "Database connection failed",
              errorCode: "DB_ERROR",
              isRetryable: true,
            },
            { status: 500 },
          );
        }),
      );

      await expect(apiRequest("/test")).rejects.toMatchObject({
        name: "ApiError",
        status: 500,
        message: "Database connection failed",
        errorCode: "DB_ERROR",
        isRetryable: true,
      });
    });

    it("should handle network errors", async () => {
      server.use(apiHandlers.networkError("/api/test"));

      await expect(apiRequest("/test")).rejects.toThrow();
    });

    it("should handle different HTTP methods", async () => {
      // Test POST
      server.use(
        http.post("/api/test", () => {
          return HttpResponse.json({ success: true });
        }),
      );

      const postResult = await apiRequest("/test", {
        method: "POST",
        body: JSON.stringify({ data: 1 }),
      });
      expect(postResult).toEqual({ success: true });

      // Test PUT
      server.use(
        http.put("/api/test/1", () => {
          return HttpResponse.json({ updated: true });
        }),
      );

      const putResult = await apiRequest("/test/1", {
        method: "PUT",
        body: JSON.stringify({ data: 2 }),
      });
      expect(putResult).toEqual({ updated: true });

      // Test DELETE
      server.use(
        http.delete("/api/test/1", () => {
          return new HttpResponse(null, { status: 204 });
        }),
      );

      const deleteResult = await apiRequest("/test/1", { method: "DELETE" });
      expect(deleteResult).toBeNull();
    });

    it("should handle empty response body", async () => {
      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json(null);
        }),
      );

      const result = await apiRequest("/test");
      expect(result).toBeNull();
    });

    it("should handle complex nested paths", async () => {
      server.use(
        http.get("/api/users/123/settings/preferences", () => {
          return HttpResponse.json({ theme: "dark" });
        }),
      );

      const result = await apiRequest("/users/123/settings/preferences");
      expect(result).toEqual({ theme: "dark" });
    });

    it("should handle query parameters in path", async () => {
      let receivedUrl: URL | undefined;
      server.use(
        http.get("/api/users", ({ request }) => {
          receivedUrl = new URL(request.url);
          return HttpResponse.json([]);
        }),
      );

      await apiRequest("/users?page=1&limit=10");

      expect(receivedUrl?.searchParams.get("page")).toBe("1");
      expect(receivedUrl?.searchParams.get("limit")).toBe("10");
    });
  });
});
