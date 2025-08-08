import { describe, it, expect } from "vitest";
import { createTrendSeries, createDiamondsSeries, createDotSeries, createLineSeries, createProjectionSeries, createSinkersSeries } from "./create-chart-series";

describe("create-chart-series", () => {
  const sampleData: [number, number][] = [
    [1704067200000, 180.5],
    [1704153600000, 181.0],
    [1704240000000, 180.8],
  ];

  const sampleDataWithNulls: [number, number | null][] = [
    [1704067200000, 180.5],
    [1704153600000, null],
    [1704240000000, 180.8],
  ];

  const sampleSinkersData: [number, number | null, number | null, null][] = [
    [1704067200000, 180.5, 181.0, null],
    [1704153600000, null, null, null],
    [1704240000000, 180.8, 181.2, null],
  ];

  describe("createTrendSeries", () => {
    it("should create trend series with correct properties", () => {
      const series = createTrendSeries(sampleData, "weight", "Weight", false);

      expect(series.type).toBe("line");
      expect(series.id).toBe("trend");
      expect(series.name).toBe("Weight Trend");
      expect(series.data).toBe(sampleData);
      expect(series.color).toBe("var(--chart-weight)"); // weight color
      expect(series.lineWidth).toBe(2);
      expect(series.zIndex).toBe(5);
      expect(series.legendIndex).toBe(1);
      expect(series.marker?.enabled).toBe(false);
    });

    it("should use different colors for different modes", () => {
      const weightSeries = createTrendSeries(sampleData, "weight", "Weight", false);
      const fatPercentSeries = createTrendSeries(sampleData, "fatpercent", "Fat %", false);
      const fatMassSeries = createTrendSeries(sampleData, "fatmass", "Fat Mass", false);
      const leanMassSeries = createTrendSeries(sampleData, "leanmass", "Lean Mass", false);

      expect(weightSeries.color).toBe("var(--chart-weight)");
      expect(fatPercentSeries.color).toBe("var(--chart-fatpercent)");
      expect(fatMassSeries.color).toBe("var(--chart-fatmass)");
      expect(leanMassSeries.color).toBe("var(--chart-leanmass)");
    });

    it("should adjust line width for narrow displays", () => {
      const normalSeries = createTrendSeries(sampleData, "weight", "Weight", false);
      const narrowSeries = createTrendSeries(sampleData, "weight", "Weight", true);

      expect(normalSeries.lineWidth).toBe(2);
      expect(narrowSeries.lineWidth).toBe(1.5);
    });

    it("should prevent legend item clicks", () => {
      const series = createTrendSeries(sampleData, "weight", "Weight", false);

      expect(series.events?.legendItemClick).toBeDefined();
      expect(typeof series.events?.legendItemClick).toBe("function");
    });
  });

  describe("createDiamondsSeries", () => {
    it("should create diamonds series for actual data", () => {
      const series = createDiamondsSeries(sampleDataWithNulls, false, false);

      expect(series.connectNulls).toBe(false);
      expect(series.zIndex).toBe(6);
      expect(series.lineWidth).toBe(0);
      expect(series.marker?.enabled).toBe(true);
      expect(series.marker?.symbol).toBe("diamond");
      expect(series.marker?.lineColor).toBe("var(--chart-actual-diamond)");
      expect(series.marker?.fillColor).toBe("var(--chart-diamond-fill)");
      expect(series.marker?.radius).toBe(4.5);
    });

    it("should create diamonds series for interpolated data", () => {
      const series = createDiamondsSeries(sampleDataWithNulls, true, false);

      expect(series.marker?.lineColor).toBe("var(--chart-interpolated-diamond)");
      expect(series.marker?.fillColor).toBe("var(--chart-diamond-fill)");
    });

    it("should adjust marker size for narrow displays", () => {
      const normalSeries = createDiamondsSeries(sampleDataWithNulls, false, false);
      const narrowSeries = createDiamondsSeries(sampleDataWithNulls, false, true);

      expect(normalSeries.marker?.radius).toBe(4.5);
      expect(narrowSeries.marker?.radius).toBe(3);
    });
  });

  describe("createDotSeries", () => {
    it("should create dot series for actual data", () => {
      const series = createDotSeries(sampleDataWithNulls, false);

      expect(series.connectNulls).toBe(false);
      expect(series.zIndex).toBe(4);
      expect(series.lineWidth).toBe(0);
      expect(series.marker?.enabled).toBe(true);
      expect(series.marker?.symbol).toBe("circle");
      expect(series.marker?.lineColor).toBe("var(--chart-actual-dot)");
      expect(series.marker?.fillColor).toBe("var(--chart-actual-dot)");
      expect(series.marker?.radius).toBe(2);
    });

    it("should create dot series for interpolated data", () => {
      const series = createDotSeries(sampleDataWithNulls, true);

      expect(series.marker?.lineColor).toBe("var(--chart-interpolated-dot)");
      expect(series.marker?.fillColor).toBe("var(--chart-interpolated-dot)");
    });
  });

  describe("createLineSeries", () => {
    it("should create line series for actual data", () => {
      const series = createLineSeries(sampleDataWithNulls, false);

      expect(series.type).toBe("line");
      expect(series.id).toBe("actual");
      expect(series.name).toBe("Scale Reading");
      expect(series.lineWidth).toBe(1);
      expect(series.color).toBe("var(--chart-actual-line)");
      expect(series.legendIndex).toBe(0);
      expect(series.zIndex).toBe(3);
      expect(series.connectNulls).toBe(true);
      expect(series.showInLegend).toBe(true);
      expect(series.marker?.enabled).toBe(false);
      expect(series.data).toBe(sampleDataWithNulls);
    });

    it("should create line series for interpolated data", () => {
      const series = createLineSeries(sampleDataWithNulls, true);

      expect(series.id).toBe("estimated");
      expect(series.name).toBe("Estimated Reading");
      expect(series.showInLegend).toBe(false);
    });

    it("should prevent legend item clicks", () => {
      const series = createLineSeries(sampleDataWithNulls, false);

      expect(series.events?.legendItemClick).toBeDefined();
      expect(typeof series.events?.legendItemClick).toBe("function");
    });
  });

  describe("createProjectionSeries", () => {
    it("should create projection series with correct properties", () => {
      const series = createProjectionSeries(sampleData, "fatpercent", "Fat %", false);

      expect(series.type).toBe("line");
      expect(series.id).toBe("projection");
      expect(series.name).toBe("Projected Fat %");
      expect(series.data).toBe(sampleData);
      expect(series.color).toBe("var(--chart-fatpercent)"); // fatpercent color
      expect(series.lineWidth).toBe(2);
      expect(series.dashStyle).toBe("ShortDot");
      expect(series.enableMouseTracking).toBe(false);
      expect(series.zIndex).toBe(5);
      expect(series.legendIndex).toBe(2);
    });

    it("should adjust line width for narrow displays", () => {
      const normalSeries = createProjectionSeries(sampleData, "weight", "Weight", false);
      const narrowSeries = createProjectionSeries(sampleData, "weight", "Weight", true);

      expect(normalSeries.lineWidth).toBe(2);
      expect(narrowSeries.lineWidth).toBe(1.5);
    });

    it("should prevent legend item clicks", () => {
      const series = createProjectionSeries(sampleData, "weight", "Weight", false);

      expect(series.events?.legendItemClick).toBeDefined();
      expect(typeof series.events?.legendItemClick).toBe("function");
    });
  });

  describe("createSinkersSeries", () => {
    it("should create sinkers series for actual data", () => {
      const series = createSinkersSeries(sampleSinkersData, false);

      expect(series.type).toBe("hlc");
      expect(series.id).toBe("actual-sinkers");
      expect(series.name).toBe("Actual Sinkers");
      expect(series.showInLegend).toBe(false);
      expect(series.enableMouseTracking).toBe(false);
      expect(series.zIndex).toBe(2);
      expect(series.color).toBe("var(--chart-actual-sinker)");
      expect(series.pointValKey).toBe("high");
      expect(series.data).toBe(sampleSinkersData);
    });

    it("should create sinkers series for interpolated data", () => {
      const series = createSinkersSeries(sampleSinkersData, true);

      expect(series.id).toBe("estimated-sinkers");
      expect(series.name).toBe("Estimated Sinkers");
      expect(series.color).toBe("var(--chart-interpolated-sinker)");
    });
  });

  describe("color consistency", () => {
    it("should use same colors across trend and projection series", () => {
      const trendSeries = createTrendSeries(sampleData, "leanmass", "Lean Mass", false);
      const projectionSeries = createProjectionSeries(sampleData, "leanmass", "Lean Mass", false);

      expect(trendSeries.color).toBe(projectionSeries.color);
      expect(trendSeries.color).toBe("var(--chart-leanmass)");
    });
  });

  describe("z-index layering", () => {
    it("should have correct z-index hierarchy", () => {
      const diamondsSeries = createDiamondsSeries(sampleDataWithNulls, false, false);
      const trendSeries = createTrendSeries(sampleData, "weight", "Weight", false);
      const dotSeries = createDotSeries(sampleDataWithNulls, false);
      const lineSeries = createLineSeries(sampleDataWithNulls, false);
      const sinkersSeries = createSinkersSeries(sampleSinkersData, false);

      expect(diamondsSeries.zIndex).toBe(6); // highest
      expect(trendSeries.zIndex).toBe(5);
      expect(dotSeries.zIndex).toBe(4);
      expect(lineSeries.zIndex).toBe(3);
      expect(sinkersSeries.zIndex).toBe(2); // lowest
    });
  });
});
