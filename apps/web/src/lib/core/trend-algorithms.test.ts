import { describe, it, expect } from "vitest";
import { TREND_ALGORITHM_DEFAULT, TREND_ALGORITHMS, getTrendLabel, resolveTrendAlgorithm } from "./trend-algorithms";

describe("trend-algorithms", () => {
  describe("resolveTrendAlgorithm", () => {
    it("returns the default preset for undefined", () => {
      expect(resolveTrendAlgorithm(undefined).id).toBe(TREND_ALGORITHM_DEFAULT);
    });

    it("returns the default preset for null", () => {
      expect(resolveTrendAlgorithm(null).id).toBe(TREND_ALGORITHM_DEFAULT);
    });

    it("returns the default preset for an unknown id", () => {
      expect(resolveTrendAlgorithm("some-future-algorithm").id).toBe(TREND_ALGORITHM_DEFAULT);
    });

    it("returns the matching algorithm for known ids", () => {
      for (const algorithm of TREND_ALGORITHMS) {
        expect(resolveTrendAlgorithm(algorithm.id)).toBe(algorithm);
      }
    });
  });

  describe("getTrendLabel", () => {
    it("returns 'Trend' for the default", () => {
      expect(getTrendLabel(undefined)).toBe("Trend");
      expect(getTrendLabel(TREND_ALGORITHM_DEFAULT)).toBe("Trend");
    });

    it("returns a Holt label for Holt presets", () => {
      expect(getTrendLabel("holt")).toBe("Trend (Holt)");
      expect(getTrendLabel("holt-gentle")).toBe("Trend (Holt)");
      expect(getTrendLabel("holt-responsive")).toBe("Trend (Holt)");
    });
  });

  it("has exactly one default algorithm, listed first", () => {
    expect(TREND_ALGORITHMS.filter((a) => a.isDefault)).toHaveLength(1);
    expect(TREND_ALGORITHMS[0].id).toBe(TREND_ALGORITHM_DEFAULT);
  });
});
