import { describe, it, expect } from "vitest";
import { pageTitle } from "./pageTitle";

describe("pageTitle", () => {
  it("should return just 'TrendWeight' when no title is provided", () => {
    expect(pageTitle()).toBe("TrendWeight");
  });

  it("should return just 'TrendWeight' when undefined is provided", () => {
    expect(pageTitle(undefined)).toBe("TrendWeight");
  });

  it("should return just 'TrendWeight' when empty string is provided", () => {
    expect(pageTitle("")).toBe("TrendWeight");
  });

  it("should return just 'TrendWeight' when 'TrendWeight' is provided", () => {
    expect(pageTitle("TrendWeight")).toBe("TrendWeight");
  });

  it("should return formatted title when a regular title is provided", () => {
    expect(pageTitle("Dashboard")).toBe("Dashboard - TrendWeight");
  });

  it("should return formatted title for longer titles", () => {
    expect(pageTitle("Settings and Preferences")).toBe("Settings and Preferences - TrendWeight");
  });

  it("should handle titles with special characters", () => {
    expect(pageTitle("Error 404 (Not Found)")).toBe("Error 404 (Not Found) - TrendWeight");
  });

  it("should handle titles with numbers", () => {
    expect(pageTitle("FAQ #1")).toBe("FAQ #1 - TrendWeight");
  });

  it("should handle titles with spaces", () => {
    expect(pageTitle("Weight Tracking")).toBe("Weight Tracking - TrendWeight");
  });

  it("should handle titles that are similar but not exact matches", () => {
    expect(pageTitle("TrendWeight Dashboard")).toBe("TrendWeight Dashboard - TrendWeight");
    expect(pageTitle("TrendWeight ")).toBe("TrendWeight  - TrendWeight");
    expect(pageTitle(" TrendWeight")).toBe(" TrendWeight - TrendWeight");
  });

  it("should be case sensitive", () => {
    expect(pageTitle("trendweight")).toBe("trendweight - TrendWeight");
    expect(pageTitle("TRENDWEIGHT")).toBe("TRENDWEIGHT - TrendWeight");
  });
});
