import { describe, it, expect, vi } from "vitest";
import { getDebugInfo } from "./debug-info";

vi.mock("@/lib/build/browser-info", () => ({
  getBrowserInfo: () => ({
    browser: "Chrome 127",
    userAgent: "test-agent",
    platform: "MacIntel",
    language: "en-US",
    screenResolution: "1920x1080",
    viewportSize: "1200x800",
    cookiesEnabled: true,
    localStorage: true,
  }),
}));

describe("getDebugInfo", () => {
  it("separates the build and system sections with blank lines and omits the error section", () => {
    const lines = getDebugInfo().split("\n");

    expect(lines[0]).toBe("=== Build Information ===");
    expect(lines[1]).toBe("");
    const systemHeader = lines.indexOf("=== System Information ===");
    expect(systemHeader).toBeGreaterThan(0);
    expect(lines[systemHeader - 1]).toBe("");
    expect(lines[systemHeader + 1]).toBe("");
    expect(lines).toContain("- Browser: Chrome 127");
    expect(lines).toContain("User Agent:");
    expect(lines[lines.indexOf("User Agent:") + 1]).toBe("test-agent");
    expect(lines[lines.indexOf("User Agent:") + 2]).toBe("");
    expect(lines.at(-1)).toMatch(/^Generated at: /);
    expect(getDebugInfo()).not.toContain("=== Error Details ===");
  });

  it("includes error details, the component stack and page information when given an error", () => {
    const error = new Error("Something broke");
    const text = getDebugInfo({ error, componentStack: "\n    at Widget\n    at App" });
    const lines = text.split("\n");

    expect(lines[0]).toBe("=== Error Details ===");
    expect(lines[1]).toBe("");
    expect(lines).toContain("- Error Type: Error");
    expect(lines).toContain("- Error Message: Something broke");
    expect(lines[lines.indexOf("Error Stack:") + 1]).toMatch(/^Error: Something broke/);
    const componentStack = lines.indexOf("Component Stack:");
    expect(lines.slice(componentStack + 1, componentStack + 5)).toEqual(["at Widget", "    at App", "", "Page Information:"]);
    expect(lines[lines.indexOf("=== Build Information ===") - 1]).toBe("");
  });

  it("drops the conditional error lines without leaving gaps", () => {
    const lines = getDebugInfo({ componentStack: "at Widget" }).split("\n");

    expect(lines.some((line) => line.startsWith("- Error Type:"))).toBe(false);
    expect(lines.some((line) => line.startsWith("- Error Message:"))).toBe(false);
    expect(lines[lines.indexOf("Error Stack:") + 1]).toBe("No stack trace available");
    // No two consecutive blank lines anywhere
    expect(lines.some((line, i) => line === "" && lines[i + 1] === "")).toBe(false);
  });
});
