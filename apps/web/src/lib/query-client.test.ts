import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { createQueryClient, shouldRetry } from "./query-client";

describe("query client retry policy", () => {
  it("is installed as the default retry for every query", () => {
    const client = createQueryClient();
    expect(client.getDefaultOptions().queries?.retry).toBe(shouldRetry);
  });

  it.each([400, 401, 403, 404])("does not retry a %i response", (status) => {
    expect(shouldRetry(0, new ApiError(status, "nope"))).toBe(false);
  });

  it("retries a 429 and server errors up to three times", () => {
    expect(shouldRetry(0, new ApiError(429, "slow down"))).toBe(true);
    expect(shouldRetry(2, new ApiError(500, "boom"))).toBe(true);
    expect(shouldRetry(3, new ApiError(500, "boom"))).toBe(false);
  });

  it("retries non-API failures such as network errors up to three times", () => {
    expect(shouldRetry(0, new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetry(3, new TypeError("Failed to fetch"))).toBe(false);
  });
});
