import { describe, it, expect } from "vitest";
import type { SeriesLegendItemClickEventObject } from "highcharts";
import { createTrendSeries, createDiamondsSeries, createDotSeries, createLineSeries, createProjectionSeries, createSinkersSeries } from "./create-chart-series";

type LegendClickHandler = (this: unknown, event: SeriesLegendItemClickEventObject) => boolean | undefined;

// Invokes a series' legendItemClick handler the way Highcharts would and returns its result
function clickLegendItem(handler: unknown): boolean | undefined {
  const event = { browserEvent: {}, preventDefault: () => {}, type: "legendItemClick", visible: true } as unknown as SeriesLegendItemClickEventObject;
  return (handler as LegendClickHandler).call({}, event);
}

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
    it("builds the trend line in the mode's colour with the mode and algorithm in its name", () => {
      const series = createTrendSeries(sampleData, "weight", "Weight", false, "Trend");

      expect(series).toMatchObject({
        type: "line",
        id: "trend",
        name: "Weight Trend",
        color: "var(--chart-weight)",
        lineWidth: 2,
        zIndex: 5,
        legendIndex: 1,
        marker: { enabled: false },
      });
      expect(series.data).toBe(sampleData);
    });

    it.each([
      ["weight", "var(--chart-weight)"],
      ["fatpercent", "var(--chart-fatpercent)"],
      ["fatmass", "var(--chart-fatmass)"],
      ["leanmass", "var(--chart-leanmass)"],
    ] as const)("colours the %s trend with %s", (mode, color) => {
      expect(createTrendSeries(sampleData, mode, "Label", false, "Trend").color).toBe(color);
    });

    it("draws a thinner line on narrow displays", () => {
      expect(createTrendSeries(sampleData, "weight", "Weight", false, "Trend").lineWidth).toBe(2);
      expect(createTrendSeries(sampleData, "weight", "Weight", true, "Trend").lineWidth).toBe(1.5);
    });

    it("cancels legend clicks so the trend cannot be hidden", () => {
      const series = createTrendSeries(sampleData, "weight", "Weight", false, "Trend");

      expect(clickLegendItem(series.events?.legendItemClick)).toBe(false);
    });

    it("uses the provided trend label in the series name", () => {
      expect(createTrendSeries(sampleData, "weight", "Weight", false, "Trend (Holt)").name).toBe("Weight Trend (Holt)");
    });
  });

  describe("createDiamondsSeries", () => {
    it("draws actual readings as unconnected diamonds above everything else", () => {
      const series = createDiamondsSeries(sampleDataWithNulls, false, false);

      expect(series).toMatchObject({
        type: "line",
        id: "actual",
        name: "Scale Reading",
        color: "var(--chart-actual-line)",
        connectNulls: false,
        zIndex: 6,
        lineWidth: 0,
        showInLegend: true,
        marker: {
          enabled: true,
          symbol: "diamond",
          lineColor: "var(--chart-actual-diamond)",
          fillColor: "var(--chart-diamond-fill)",
          lineWidth: 1,
          radius: 4.5,
        },
      });
      expect(series.data).toBe(sampleDataWithNulls);
    });

    it("draws interpolated readings as estimated diamonds hidden from the legend", () => {
      const series = createDiamondsSeries(sampleDataWithNulls, true, false);

      expect(series).toMatchObject({
        id: "estimated",
        name: "Estimated Reading",
        showInLegend: false,
        marker: { symbol: "diamond", lineColor: "var(--chart-interpolated-diamond)", fillColor: "var(--chart-diamond-fill)" },
      });
    });

    it("uses smaller diamonds on narrow displays", () => {
      expect(createDiamondsSeries(sampleDataWithNulls, false, false).marker?.radius).toBe(4.5);
      expect(createDiamondsSeries(sampleDataWithNulls, false, true).marker?.radius).toBe(3);
    });

    it("cancels legend clicks", () => {
      const series = createDiamondsSeries(sampleDataWithNulls, false, false);

      expect(clickLegendItem(series.events?.legendItemClick)).toBe(false);
    });
  });

  describe("createDotSeries", () => {
    it("draws actual readings as small unconnected dots", () => {
      const series = createDotSeries(sampleDataWithNulls, false);

      expect(series).toMatchObject({
        id: "actual",
        connectNulls: false,
        zIndex: 4,
        lineWidth: 0,
        marker: {
          enabled: true,
          symbol: "circle",
          lineColor: "var(--chart-actual-dot)",
          fillColor: "var(--chart-actual-dot)",
          lineWidth: 0,
          radius: 2,
        },
      });
    });

    it("draws interpolated readings as estimated dots", () => {
      const series = createDotSeries(sampleDataWithNulls, true);

      expect(series).toMatchObject({
        id: "estimated",
        marker: { symbol: "circle", lineColor: "var(--chart-interpolated-dot)", fillColor: "var(--chart-interpolated-dot)" },
      });
    });
  });

  describe("createLineSeries", () => {
    it("draws actual readings as a thin connected line without markers", () => {
      const series = createLineSeries(sampleDataWithNulls, false);

      expect(series).toMatchObject({
        type: "line",
        id: "actual",
        name: "Scale Reading",
        lineWidth: 1,
        color: "var(--chart-actual-line)",
        legendIndex: 0,
        zIndex: 3,
        connectNulls: true,
        showInLegend: true,
        marker: { enabled: false },
      });
      expect(series.data).toBe(sampleDataWithNulls);
    });

    it("draws interpolated readings as an estimated line hidden from the legend", () => {
      const series = createLineSeries(sampleDataWithNulls, true);

      expect(series).toMatchObject({ id: "estimated", name: "Estimated Reading", showInLegend: false });
    });

    it("cancels legend clicks", () => {
      const series = createLineSeries(sampleDataWithNulls, false);

      expect(clickLegendItem(series.events?.legendItemClick)).toBe(false);
    });
  });

  describe("createProjectionSeries", () => {
    it("draws a dotted, non-interactive projection in the mode's colour", () => {
      const series = createProjectionSeries(sampleData, "fatpercent", "Fat %", false);

      expect(series).toMatchObject({
        type: "line",
        id: "projection",
        name: "Projected Fat %",
        color: "var(--chart-fatpercent)",
        lineWidth: 2,
        dashStyle: "ShortDot",
        enableMouseTracking: false,
        zIndex: 5,
        legendIndex: 2,
      });
      expect(series.data).toBe(sampleData);
    });

    it("draws a thinner line on narrow displays", () => {
      expect(createProjectionSeries(sampleData, "weight", "Weight", false).lineWidth).toBe(2);
      expect(createProjectionSeries(sampleData, "weight", "Weight", true).lineWidth).toBe(1.5);
    });

    it("cancels legend clicks", () => {
      const series = createProjectionSeries(sampleData, "weight", "Weight", false);

      expect(clickLegendItem(series.events?.legendItemClick)).toBe(false);
    });
  });

  describe("createSinkersSeries", () => {
    it("draws actual sinkers as a hidden, non-interactive hlc series", () => {
      const series = createSinkersSeries(sampleSinkersData, false);

      expect(series).toMatchObject({
        type: "hlc",
        id: "actual-sinkers",
        name: "Actual Sinkers",
        showInLegend: false,
        enableMouseTracking: false,
        zIndex: 2,
        color: "var(--chart-actual-sinker)",
        pointValKey: "high",
      });
      expect(series.data).toBe(sampleSinkersData);
    });

    it("draws interpolated sinkers in the estimated colour", () => {
      const series = createSinkersSeries(sampleSinkersData, true);

      expect(series).toMatchObject({ id: "estimated-sinkers", name: "Estimated Sinkers", color: "var(--chart-interpolated-sinker)" });
    });
  });

  it("uses the same colour for a mode's trend and projection", () => {
    const trend = createTrendSeries(sampleData, "leanmass", "Lean Mass", false, "Trend");
    const projection = createProjectionSeries(sampleData, "leanmass", "Lean Mass", false);

    expect(trend.color).toBe("var(--chart-leanmass)");
    expect(projection.color).toBe("var(--chart-leanmass)");
  });

  it("layers diamonds above the trend, dots, lines and sinkers in that order", () => {
    const zIndexes = [
      createDiamondsSeries(sampleDataWithNulls, false, false).zIndex,
      createTrendSeries(sampleData, "weight", "Weight", false, "Trend").zIndex,
      createDotSeries(sampleDataWithNulls, false).zIndex,
      createLineSeries(sampleDataWithNulls, false).zIndex,
      createSinkersSeries(sampleSinkersData, false).zIndex,
    ];

    expect(zIndexes).toEqual([6, 5, 4, 3, 2]);
  });
});
