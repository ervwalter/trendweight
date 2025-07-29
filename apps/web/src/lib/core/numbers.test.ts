import { describe, it, expect } from "vitest";
import { formatWeight, formatPercent, formatNumber, formatMeasurement, formatPlannedWeight } from "./numbers";

describe("numbers", () => {
  describe("formatWeight", () => {
    it("should format metric weights without sign", () => {
      const result = formatWeight(75.5, true, false);
      expect(result).toMatch(/75\.5.*kg/i);
    });

    it("should format imperial weights without sign", () => {
      const result = formatWeight(166.4, false, false);
      expect(result).toMatch(/166\.4.*lb/i);
    });

    it("should format metric weights with sign", () => {
      const result = formatWeight(-2.3, true, true);
      expect(result).toMatch(/-2\.3.*kg/i);
    });

    it("should format imperial weights with sign", () => {
      const result = formatWeight(1.7, false, true);
      expect(result).toMatch(/\+1\.7.*lb/i);
    });

    it("should handle zero values", () => {
      const metricResult = formatWeight(0, true, false);
      const imperialResult = formatWeight(0, false, false);
      expect(metricResult).toMatch(/0\.0.*kg/i);
      expect(imperialResult).toMatch(/0\.0.*lb/i);
    });

    it("should handle zero values with sign", () => {
      const metricResult = formatWeight(0, true, true);
      const imperialResult = formatWeight(0, false, true);
      expect(metricResult).toMatch(/\+0\.0.*kg/i);
      expect(imperialResult).toMatch(/\+0\.0.*lb/i);
    });
  });

  describe("formatPercent", () => {
    it("should format percentages without sign", () => {
      const result = formatPercent(0.234, false);
      expect(result).toMatch(/23\.4.*%/);
    });

    it("should format percentages with sign", () => {
      const result = formatPercent(-0.056, true);
      expect(result).toMatch(/-5\.6.*%/);
    });

    it("should format positive percentages with sign", () => {
      const result = formatPercent(0.078, true);
      expect(result).toMatch(/\+7\.8.*%/);
    });

    it("should handle zero percentage", () => {
      const result = formatPercent(0, false);
      expect(result).toMatch(/0\.0.*%/);
    });

    it("should handle zero percentage with sign", () => {
      const result = formatPercent(0, true);
      expect(result).toMatch(/\+0\.0.*%/);
    });

    it("should handle very small percentages", () => {
      const result = formatPercent(0.001, false);
      expect(result).toMatch(/0\.1.*%/);
    });
  });

  describe("formatNumber", () => {
    it("should format numbers without sign", () => {
      const result = formatNumber(123.456, false);
      expect(result).toBe("123.5");
    });

    it("should format numbers with sign", () => {
      const negativeResult = formatNumber(-45.67, true);
      const positiveResult = formatNumber(89.12, true);
      expect(negativeResult).toBe("-45.7");
      expect(positiveResult).toBe("+89.1");
    });

    it("should handle zero", () => {
      const withoutSign = formatNumber(0, false);
      const withSign = formatNumber(0, true);
      expect(withoutSign).toBe("0.0");
      expect(withSign).toBe("+0.0");
    });

    it("should round to one decimal place", () => {
      expect(formatNumber(1.49, false)).toBe("1.5");
      expect(formatNumber(1.44, false)).toBe("1.4");
    });
  });

  describe("formatMeasurement", () => {
    it("should format weight measurements with metric units", () => {
      const result = formatMeasurement(70.5, {
        type: "weight",
        metric: true,
        units: true,
        sign: false,
      });
      expect(result).toMatch(/70\.5.*kg/i);
    });

    it("should format weight measurements with imperial units", () => {
      const result = formatMeasurement(155.3, {
        type: "weight",
        metric: false,
        units: true,
        sign: false,
      });
      expect(result).toMatch(/155\.3.*lb/i);
    });

    it("should format fat percentage measurements with units", () => {
      const result = formatMeasurement(0.18, {
        type: "fatpercent",
        units: true,
        sign: false,
      });
      expect(result).toMatch(/18\.0.*%/);
    });

    it("should format fat percentage measurements without units", () => {
      const result = formatMeasurement(0.18, {
        type: "fatpercent",
        units: false,
        sign: false,
      });
      expect(result).toBe("18.0");
    });

    it("should format fat mass measurements", () => {
      const result = formatMeasurement(15.2, {
        type: "fatmass",
        metric: true,
        units: true,
        sign: false,
      });
      expect(result).toMatch(/15\.2.*kg/i);
    });

    it("should format lean mass measurements", () => {
      const result = formatMeasurement(55.8, {
        type: "leanmass",
        metric: false,
        units: true,
        sign: false,
      });
      expect(result).toMatch(/55\.8.*lb/i);
    });

    it("should handle measurements without units", () => {
      const result = formatMeasurement(75.5, {
        type: "weight",
        units: false,
        sign: false,
      });
      expect(result).toBe("75.5");
    });

    it("should handle measurements with sign", () => {
      const result = formatMeasurement(-2.3, {
        type: "weight",
        metric: true,
        units: true,
        sign: true,
      });
      expect(result).toMatch(/-2\.3.*kg/i);
    });

    it("should handle fat percentage with sign", () => {
      const result = formatMeasurement(0.025, {
        type: "fatpercent",
        units: true,
        sign: true,
      });
      expect(result).toMatch(/\+2\.5.*%/);
    });
  });

  describe("formatPlannedWeight", () => {
    it("should format metric planned weights with proper precision", () => {
      expect(formatPlannedWeight(0.25, true)).toMatch(/0\.25.*kg/i);
      expect(formatPlannedWeight(0.75, true)).toMatch(/0\.75.*kg/i);
      expect(formatPlannedWeight(1.0, true)).toMatch(/1.*kg/i);
      expect(formatPlannedWeight(0.5, true)).toMatch(/0\.5.*kg/i);
    });

    it("should format imperial planned weights normally", () => {
      expect(formatPlannedWeight(0.5, false)).toMatch(/0\.5.*lb/i);
      expect(formatPlannedWeight(1.5, false)).toMatch(/1\.5.*lb/i);
      expect(formatPlannedWeight(2.0, false)).toMatch(/2\.0.*lb/i);
    });

    it("should handle zero values", () => {
      expect(formatPlannedWeight(0, true)).toMatch(/0.*kg/i);
      expect(formatPlannedWeight(0, false)).toMatch(/0\.0.*lb/i);
    });
  });
});
