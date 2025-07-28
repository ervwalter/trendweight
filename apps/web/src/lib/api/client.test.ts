import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../test/mocks/server";
import { apiRequest, ApiError } from "./client";
import { apiHandlers } from "../../test/mocks/handlers";

// Mock window.Clerk
const mockClerk = {
  user: null as any,
  loaded: true,
  session: null as any,
};

// @ts-expect-error - Mock window.Clerk for testing
global.window = {
  Clerk: mockClerk,
};

describe("api/client with MSW", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerk.session = null;
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

      mockClerk.session = null;

      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json(mockResponse);
        }),
      );

      const result = await apiRequest<typeof mockResponse>("/test");

      expect(result).toEqual(mockResponse);
    });

    it("should include auth token when session exists", async () => {
      const mockToken = "test-jwt-token";
      const mockResponse = { data: "authenticated" };

      mockClerk.session = {
        getToken: vi.fn().mockResolvedValue(mockToken),
      };

      // Use MSW to verify the authorization header
      let receivedHeaders: Headers | undefined;
      server.use(
        http.get("/api/protected", ({ request }) => {
          receivedHeaders = request.headers;
          return HttpResponse.json(mockResponse);
        }),
      );

      await apiRequest("/protected");

      expect(mockClerk.session.getToken).toHaveBeenCalled();
      expect(receivedHeaders?.get("Authorization")).toBe(`Bearer ${mockToken}`);
    });

    it("should handle getToken failure gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockClerk.session = {
        getToken: vi.fn().mockRejectedValue(new Error("Token error")),
      };

      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json({ data: "test" });
        }),
      );

      const result = await apiRequest("/test");

      expect(result).toEqual({ data: "test" });
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to get Clerk token:", expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it("should merge custom headers with defaults", async () => {
      mockClerk.session = null;

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
      mockClerk.session = null;

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
      mockClerk.session = null;

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

      await expect(apiRequest("/test")).rejects.toThrow(ApiError);

      try {
        await apiRequest("/test");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(400);
        expect(apiError.message).toBe("Invalid input data");
        expect(apiError.errorCode).toBe("VALIDATION_ERROR");
        expect(apiError.isRetryable).toBe(false);
      }
    });

    it("should handle non-JSON error response", async () => {
      mockClerk.session = null;

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

      try {
        await apiRequest("/test");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.status).toBe(500);
        expect(apiError.message).toBe("API request failed: Internal Server Error");
        expect(apiError.errorCode).toBeUndefined();
        expect(apiError.isRetryable).toBeUndefined();
      }
    });

    it("should handle 401 unauthorized errors", async () => {
      mockClerk.session = null;

      server.use(apiHandlers.unauthorized("/api/protected"));

      try {
        await apiRequest("/protected");
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(401);
        expect(apiError.message).toBe("Authentication required");
        expect(apiError.errorCode).toBe("AUTH_REQUIRED");
      }
    });

    it("should handle 403 forbidden errors", async () => {
      mockClerk.session = {
        getToken: vi.fn().mockResolvedValue("valid-token"),
      };

      server.use(apiHandlers.forbidden("/api/admin"));

      try {
        await apiRequest("/admin");
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(403);
        expect(apiError.message).toBe("Insufficient permissions");
      }
    });

    it("should handle 404 not found errors", async () => {
      mockClerk.session = null;

      server.use(apiHandlers.notFound("/api/missing"));

      try {
        await apiRequest("/missing");
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(404);
        expect(apiError.message).toBe("Resource not found");
        expect(apiError.errorCode).toBe("NOT_FOUND");
      }
    });

    it("should handle 500 server errors with retry flag", async () => {
      mockClerk.session = null;

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

      try {
        await apiRequest("/test");
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(500);
        expect(apiError.message).toBe("Database connection failed");
        expect(apiError.errorCode).toBe("DB_ERROR");
        expect(apiError.isRetryable).toBe(true);
      }
    });

    it("should handle network errors", async () => {
      mockClerk.session = null;

      server.use(apiHandlers.networkError("/api/test"));

      await expect(apiRequest("/test")).rejects.toThrow();
    });

    it("should handle different HTTP methods", async () => {
      mockClerk.session = null;

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
      mockClerk.session = null;

      server.use(
        http.get("/api/test", () => {
          return HttpResponse.json(null);
        }),
      );

      const result = await apiRequest("/test");
      expect(result).toBeNull();
    });

    it("should handle complex nested paths", async () => {
      mockClerk.session = null;

      server.use(
        http.get("/api/users/123/settings/preferences", () => {
          return HttpResponse.json({ theme: "dark" });
        }),
      );

      const result = await apiRequest("/users/123/settings/preferences");
      expect(result).toEqual({ theme: "dark" });
    });

    it("should handle query parameters in path", async () => {
      mockClerk.session = null;

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
