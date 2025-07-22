import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { shouldUseMetric, extractFirstName } from "./locale";

describe("locale", () => {
  describe("shouldUseMetric", () => {
    let originalNavigator: Navigator;

    beforeEach(() => {
      // Store original navigator
      originalNavigator = global.navigator;
    });

    afterEach(() => {
      // Restore original navigator
      global.navigator = originalNavigator;
    });

    it("should return false for US locale", () => {
      expect(shouldUseMetric("en-US")).toBe(false);
    });

    it("should return false for UK/GB locales", () => {
      expect(shouldUseMetric("en-GB")).toBe(false);
      expect(shouldUseMetric("en-UK")).toBe(false);
    });

    it("should return false for Myanmar", () => {
      expect(shouldUseMetric("my-MM")).toBe(false);
    });

    it("should return false for Liberia", () => {
      expect(shouldUseMetric("en-LR")).toBe(false);
    });

    it("should return true for metric countries", () => {
      expect(shouldUseMetric("fr-FR")).toBe(true);
      expect(shouldUseMetric("de-DE")).toBe(true);
      expect(shouldUseMetric("es-ES")).toBe(true);
      expect(shouldUseMetric("ja-JP")).toBe(true);
      expect(shouldUseMetric("zh-CN")).toBe(true);
      expect(shouldUseMetric("en-CA")).toBe(true);
      expect(shouldUseMetric("en-AU")).toBe(true);
    });

    it("should handle case insensitive country codes", () => {
      expect(shouldUseMetric("en-us")).toBe(false);
      expect(shouldUseMetric("en-gb")).toBe(false);
      expect(shouldUseMetric("fr-fr")).toBe(true);
    });

    it("should use navigator.language when no locale provided", () => {
      global.navigator = {
        ...originalNavigator,
        language: "fr-FR",
        languages: ["fr-FR", "en-US"],
      } as Navigator;

      expect(shouldUseMetric()).toBe(true);
    });

    it("should use navigator.languages[0] when navigator.language is not available", () => {
      global.navigator = {
        ...originalNavigator,
        language: "",
        languages: ["de-DE", "en-US"],
      } as Navigator;

      expect(shouldUseMetric()).toBe(true);
    });

    it("should default to US (imperial) when no locale info available", () => {
      global.navigator = {
        ...originalNavigator,
        language: "",
        languages: [],
      } as Navigator;

      expect(shouldUseMetric()).toBe(false);
    });

    it("should handle locales without country codes", () => {
      expect(shouldUseMetric("en")).toBe(true); // No country code, defaults to metric
      expect(shouldUseMetric("fr")).toBe(true);
    });

    it("should handle malformed locales", () => {
      expect(shouldUseMetric("")).toBe(false); // Empty string defaults to en-US
      expect(shouldUseMetric("invalid")).toBe(true); // Invalid format, no country code
    });

    it("should handle locales with multiple hyphens", () => {
      expect(shouldUseMetric("zh-Hans-CN")).toBe(true); // Should use last part (CN)
      expect(shouldUseMetric("en-US-POSIX")).toBe(true); // Should use last part (POSIX -> not in imperial list, defaults to metric)
    });

    it("should handle null/undefined navigator properties", () => {
      global.navigator = {
        ...originalNavigator,
        language: undefined as any,
        languages: undefined as any,
      } as Navigator;

      expect(shouldUseMetric()).toBe(false); // Should default to en-US
    });
  });

  describe("extractFirstName", () => {
    it("should extract first name from full name", () => {
      expect(extractFirstName("John Doe")).toBe("John");
    });

    it("should extract first name from name with middle name", () => {
      expect(extractFirstName("John Michael Doe")).toBe("John");
    });

    it("should handle single name", () => {
      expect(extractFirstName("John")).toBe("John");
    });

    it("should handle empty string", () => {
      expect(extractFirstName("")).toBe("");
    });

    it("should handle null", () => {
      expect(extractFirstName(null)).toBe("");
    });

    it("should handle undefined", () => {
      expect(extractFirstName(undefined)).toBe("");
    });

    it("should handle names with extra whitespace", () => {
      expect(extractFirstName("  John   Doe  ")).toBe("John");
    });

    it("should handle names with multiple spaces", () => {
      expect(extractFirstName("John     Doe")).toBe("John");
    });

    it("should handle names with tabs and newlines", () => {
      expect(extractFirstName("John\t\nDoe")).toBe("John");
    });

    it("should handle names starting with whitespace", () => {
      expect(extractFirstName("   John Doe")).toBe("John");
    });

    it("should handle names ending with whitespace", () => {
      expect(extractFirstName("John Doe   ")).toBe("John");
    });

    it("should handle hyphenated first names", () => {
      expect(extractFirstName("Mary-Jane Watson")).toBe("Mary-Jane");
    });

    it("should handle names with apostrophes", () => {
      expect(extractFirstName("O'Connor Smith")).toBe("O'Connor");
    });

    it("should handle names with periods", () => {
      expect(extractFirstName("Dr. John Doe")).toBe("Dr.");
    });

    it("should handle international names", () => {
      expect(extractFirstName("José María García")).toBe("José");
      expect(extractFirstName("李 小明")).toBe("李");
    });

    it("should handle empty parts after split", () => {
      expect(extractFirstName("")).toBe("");
      expect(extractFirstName("   ")).toBe("");
    });

    it("should handle very long names", () => {
      const longName = "Abcdefghijklmnopqrstuvwxyz Smith";
      expect(extractFirstName(longName)).toBe("Abcdefghijklmnopqrstuvwxyz");
    });
  });
});
