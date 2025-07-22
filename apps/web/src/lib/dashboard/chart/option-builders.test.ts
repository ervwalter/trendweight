import { describe, it, expect } from "vitest";
import { LocalDate } from "@js-joda/core";
import { buildWeekendPlotBands, build4WeekOptions, build3MonthOptions, buildLongTermOptions, buildExploreOptions, buildYAxisOptions } from "./option-builders";
import type { Options } from "highcharts";

describe("option-builders", () => {
  const createMockOptions = (): Options => ({
    series: [],
    xAxis: {
      tickInterval: 0,
      range: 0,
      plotBands: [],
    },
    yAxis: {},
    chart: {
      spacingBottom: 20,
    },
    legend: {
      enabled: true,
    },
  });

  const createBuilderOptions = () => ({
    mode: "weight" as const,
    modeText: "Weight",
    isNarrow: false,
    lastMeasurement: {
      date: LocalDate.of(2024, 1, 15),
      trend: 180.5,
    },
    dataArrays: {
      actualData: [
        [1704067200000, 180.5],
        [1704153600000, 179.8],
      ] as [number, number | null][],
      interpolatedData: [
        [1704067200000, null],
        [1704153600000, 180.0],
      ] as [number, number | null][],
      trendData: [
        [1704067200000, 181.0],
        [1704153600000, 180.8],
      ] as [number, number][],
      projectionsData: [
        [1704240000000, 180.6],
        [1704758400000, 180.3],
      ] as [number, number][],
      actualSinkersData: [[1704067200000, 180.5, 181.0, null]] as [number, number | null, number | null, null][],
      interpolatedSinkersData: [[1704153600000, 180.0, 180.8, null]] as [number, number | null, number | null, null][],
    },
  });

  describe("buildWeekendPlotBands", () => {
    it("should generate weekend plot bands", () => {
      const date = LocalDate.of(2024, 1, 15); // Monday
      const plotBands = buildWeekendPlotBands(date);

      expect(plotBands).toBeDefined();
      expect(Array.isArray(plotBands)).toBe(true);
      expect(plotBands!.length).toBeGreaterThan(0);
    });

    it("should create plot bands with correct properties", () => {
      const date = LocalDate.of(2024, 1, 15);
      const plotBands = buildWeekendPlotBands(date);
      const firstBand = plotBands![0];

      expect(firstBand).toMatchObject({
        color: "rgba(220, 220, 220, 0.2)",
        zIndex: 1,
      });
      expect(typeof firstBand.from).toBe("number");
      expect(typeof firstBand.to).toBe("number");
      expect(firstBand.to).toBeGreaterThan(firstBand.from as number);
    });

    it("should handle different starting days of week", () => {
      const saturday = LocalDate.of(2024, 1, 13); // Saturday
      const plotBands = buildWeekendPlotBands(saturday);
      expect(plotBands).toBeDefined();
      expect(plotBands!.length).toBeGreaterThan(0);
    });
  });

  describe("build4WeekOptions", () => {
    it("should configure options for 4-week view", () => {
      const options = createMockOptions();
      const builderOptions = createBuilderOptions();

      build4WeekOptions(options, builderOptions);

      expect(options.series).toHaveLength(6); // trend, 2x diamonds, 2x sinkers, projection
      expect((options.xAxis as any)?.tickInterval).toBe(86400000 * 7); // 7 days
      expect((options.xAxis as any)?.range).toBe(86400000 * (28 - 1 + 6)); // 4 weeks + projection
      expect((options.xAxis as any)?.plotBands).toBeDefined();
    });

    it("should not modify options if series or xAxis is missing", () => {
      const options: Options = {};
      const builderOptions = createBuilderOptions();

      build4WeekOptions(options, builderOptions);

      expect(options.series).toBeUndefined();
    });

    it("should not modify options if xAxis is an array", () => {
      const options: Options = {
        series: [],
        xAxis: [{}], // array instead of single object
      };
      const builderOptions = createBuilderOptions();

      build4WeekOptions(options, builderOptions);

      expect(options.series).toHaveLength(0);
    });

    it("should adjust for narrow displays", () => {
      const options = createMockOptions();
      const builderOptions = { ...createBuilderOptions(), isNarrow: true };

      build4WeekOptions(options, builderOptions);

      expect(options.series).toHaveLength(6);
      // Check that series are created with isNarrow: true
      // (We can't easily test the internal properties without more complex setup)
    });
  });

  describe("build3MonthOptions", () => {
    it("should configure options for 3-month view", () => {
      const options = createMockOptions();
      const builderOptions = createBuilderOptions();

      build3MonthOptions(options, builderOptions);

      expect(options.series!.length).toBeGreaterThan(3); // trend, dots/sinkers, projection
      expect((options.xAxis as any)?.tickInterval).toBe(86400000 * 7);
      expect((options.xAxis as any)?.range).toBe(86400000 * (90 - 1 + 6));
      expect((options.xAxis as any)?.plotBands).toEqual([]);
    });

    it("should use line series for narrow displays", () => {
      const options = createMockOptions();
      const builderOptions = { ...createBuilderOptions(), isNarrow: true };

      build3MonthOptions(options, builderOptions);

      expect(options.series).toHaveLength(3); // trend, line, projection
    });

    it("should use dots and sinkers for wide displays", () => {
      const options = createMockOptions();
      const builderOptions = { ...createBuilderOptions(), isNarrow: false };

      build3MonthOptions(options, builderOptions);

      expect(options.series!.length).toBeGreaterThan(3); // trend, dots, sinkers, projection
    });
  });

  describe("buildLongTermOptions", () => {
    it("should configure options for 6-month view", () => {
      const options = createMockOptions();
      const builderOptions = createBuilderOptions();

      buildLongTermOptions(options, builderOptions, "6m");

      expect(options.series).toHaveLength(3); // trend, line, projection
      expect((options.xAxis as any)?.range).toBe(86400000 * (180 - 1 + 6));
      expect((options.xAxis as any)?.plotBands).toEqual([]);
    });

    it("should configure options for 1-year view", () => {
      const options = createMockOptions();
      const builderOptions = createBuilderOptions();

      buildLongTermOptions(options, builderOptions, "1y");

      expect(options.series).toHaveLength(3);
      expect((options.xAxis as any)?.range).toBe(86400000 * (365 - 1 + 6));
    });

    it("should configure options for all-time view", () => {
      const options = createMockOptions();
      const builderOptions = createBuilderOptions();

      buildLongTermOptions(options, builderOptions, "all");

      expect(options.series).toHaveLength(3);
      expect((options.xAxis as any)?.range).toBe(86400000 * (builderOptions.dataArrays.trendData.length - 1 + 6));
    });

    it("should reset series array", () => {
      const options = createMockOptions();
      options.series = [{ type: "line", data: [] }]; // pre-existing series
      const builderOptions = createBuilderOptions();

      buildLongTermOptions(options, builderOptions, "6m");

      expect(options.series).toHaveLength(3); // should be replaced, not appended
    });
  });

  describe("buildExploreOptions", () => {
    it("should configure options for explore view", () => {
      const options = createMockOptions();
      const builderOptions = createBuilderOptions();

      buildExploreOptions(options, builderOptions);

      expect(options.series!.length).toBeGreaterThan(0);
      expect(options.chart?.spacingBottom).toBe(10);
      expect(options.legend?.enabled).toBe(false);
      expect((options.xAxis as any)?.min).toBeDefined();
      expect((options.xAxis as any)?.max).toBeDefined();
      expect((options.xAxis as any)?.range).toBeUndefined();
      expect(options.navigator).toBeDefined();
      expect(options.scrollbar).toBeDefined();
    });

    it("should set correct initial date range", () => {
      const options = createMockOptions();
      const builderOptions = createBuilderOptions();
      const lastDate = builderOptions.lastMeasurement.date;
      const expectedMin = lastDate.minusMonths(6).toEpochDay() * 86400000;
      const expectedMax = lastDate.plusDays(6).toEpochDay() * 86400000;

      buildExploreOptions(options, builderOptions);

      expect((options.xAxis as any)?.min).toBe(expectedMin);
      expect((options.xAxis as any)?.max).toBe(expectedMax);
    });

    it("should configure navigator properties", () => {
      const options = createMockOptions();
      const builderOptions = createBuilderOptions();

      buildExploreOptions(options, builderOptions);

      expect(options.navigator).toMatchObject({
        enabled: true,
        height: 30,
        margin: 10,
      });
      expect(options.navigator?.series).toBeDefined();
      expect(options.navigator?.xAxis).toBeDefined();
    });

    it("should add afterSetExtremes event handler", () => {
      const options = createMockOptions();
      const builderOptions = createBuilderOptions();

      buildExploreOptions(options, builderOptions);

      expect((options.xAxis as any)?.events?.afterSetExtremes).toBeDefined();
      expect(typeof (options.xAxis as any)?.events?.afterSetExtremes).toBe("function");
    });

    it("should use line series for narrow displays", () => {
      const options = createMockOptions();
      const builderOptions = { ...createBuilderOptions(), isNarrow: true };

      buildExploreOptions(options, builderOptions);

      // Should have fewer series for narrow displays
      expect(options.series!.length).toBeLessThan(6);
    });
  });

  describe("buildYAxisOptions", () => {
    it("should set minRange for fatpercent mode", () => {
      const options = createMockOptions();

      buildYAxisOptions(options, "fatpercent", false);

      expect((options.yAxis as any)?.minRange).toBe(5);
    });

    it("should set minRange for weight mode with imperial units", () => {
      const options = createMockOptions();

      buildYAxisOptions(options, "weight", false);

      expect((options.yAxis as any)?.minRange).toBe(5);
    });

    it("should set minRange for weight mode with metric units", () => {
      const options = createMockOptions();

      buildYAxisOptions(options, "weight", true);

      expect((options.yAxis as any)?.minRange).toBe(3);
    });

    it("should not set minRange for other modes", () => {
      const options = createMockOptions();

      buildYAxisOptions(options, "fatmass", false);

      expect((options.yAxis as any)?.minRange).toBeUndefined();
    });

    it("should add goal bands for weight mode with goal", () => {
      const options = createMockOptions();
      const goalWeight = 175;

      buildYAxisOptions(options, "weight", false, goalWeight);

      expect((options.yAxis as any)?.plotBands).toHaveLength(1);
      expect((options.yAxis as any)?.plotLines).toHaveLength(2);

      const plotBand = (options.yAxis as any)?.plotBands![0];
      expect(plotBand?.from).toBe(goalWeight - 2.5);
      expect(plotBand?.to).toBe(goalWeight + 2.5);
      expect(plotBand?.color).toBe("rgb(244, 255, 244)");
    });

    it("should use metric goal width for metric units", () => {
      const options = createMockOptions();
      const goalWeight = 80;

      buildYAxisOptions(options, "weight", true, goalWeight);

      const plotBand = (options.yAxis as any)?.plotBands![0];
      expect(plotBand?.from).toBe(goalWeight - 1.134);
      expect(plotBand?.to).toBe(goalWeight + 1.134);
    });

    it("should not add goal bands for non-weight modes", () => {
      const options = createMockOptions();

      buildYAxisOptions(options, "fatpercent", false, 25);

      expect((options.yAxis as any)?.plotBands).toBeUndefined();
      expect((options.yAxis as any)?.plotLines).toBeUndefined();
    });

    it("should not modify options if yAxis is missing or array", () => {
      const optionsWithoutYAxis: Options = {};
      const optionsWithArrayYAxis: Options = { yAxis: [{}] };

      buildYAxisOptions(optionsWithoutYAxis, "weight", false, 175);
      buildYAxisOptions(optionsWithArrayYAxis, "weight", false, 175);

      expect(optionsWithoutYAxis.yAxis).toBeUndefined();
      expect(Array.isArray(optionsWithArrayYAxis.yAxis)).toBe(true);
    });
  });
});
