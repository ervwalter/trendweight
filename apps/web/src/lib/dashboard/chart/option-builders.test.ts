import { describe, it, expect, vi } from "vitest";
import { LocalDate } from "@js-joda/core";
import type { Options, SeriesHlcOptions, SeriesLineOptions, XAxisOptions, YAxisOptions } from "highcharts";
import {
  buildWeekendPlotBands,
  build4WeekOptions,
  build3MonthOptions,
  buildLongTermOptions,
  buildExploreOptions,
  buildYAxisOptions,
  DYNAMIC_SERIES_IDS,
} from "./option-builders";
import type { TransformedChartData } from "./data-transformers";

const DAY = 86400000;
const WEEK = 7 * DAY;

// Every builder guards on a non-array xAxis/yAxis, so the tests read them back through these
const xAxis = (options: Options) => options.xAxis as XAxisOptions;
const yAxis = (options: Options) => options.yAxis as YAxisOptions;
const seriesIds = (options: Options) => options.series?.map((s) => s.id);
const seriesTypes = (options: Options) => options.series?.map((s) => (s as AnySeries).type);

type AnySeries = SeriesLineOptions | SeriesHlcOptions;
type ExtremesHandler = (this: { chart: FakeChart; min: number; max: number }, e: { min?: number; max?: number }) => void;

interface FakeSeries {
  options: { id: string };
  remove: ReturnType<typeof vi.fn>;
}

interface FakeChart {
  series: FakeSeries[];
  get: (id: string) => FakeSeries | undefined;
  addSeries: ReturnType<typeof vi.fn<(series: AnySeries, redraw: boolean) => void>>;
  redraw: ReturnType<typeof vi.fn>;
}

function createFakeChart(ids: string[]): FakeChart {
  const chart: FakeChart = {
    series: ids.map((id) => ({ options: { id }, remove: vi.fn() })),
    get: (id) => chart.series.find((s) => s.options.id === id),
    addSeries: vi.fn(),
    redraw: vi.fn(),
  };
  return chart;
}

const addedSeries = (chart: FakeChart): AnySeries[] => chart.addSeries.mock.calls.map(([series]) => series);

describe("option-builders", () => {
  const createOptions = (): Options => ({
    series: [],
    xAxis: { tickInterval: 0, range: 0, plotBands: [] },
    yAxis: {},
    chart: { spacingBottom: 20 },
    legend: { enabled: true },
  });

  const dataArrays: TransformedChartData = {
    actualData: [
      [1704067200000, 180.5],
      [1704153600000, 179.8],
    ],
    interpolatedData: [
      [1704067200000, null],
      [1704153600000, 180.0],
    ],
    trendData: [
      [1704067200000, 181.0],
      [1704153600000, 180.8],
    ],
    projectionsData: [
      [1704240000000, 180.6],
      [1704758400000, 180.3],
    ],
    actualSinkersData: [[1704067200000, 180.5, 181.0, null]],
    interpolatedSinkersData: [[1704153600000, 180.0, 180.8, null]],
  };

  const createBuilderOptions = (overrides: { isNarrow?: boolean } = {}) => ({
    mode: "weight" as const,
    modeText: "Weight",
    trendLabel: "Trend",
    isNarrow: false,
    lastMeasurement: { date: LocalDate.of(2024, 1, 15), trend: 180.5 },
    dataArrays,
    ...overrides,
  });

  describe("buildWeekendPlotBands", () => {
    // Bands run from Friday noon to Sunday noon (UTC) around each Saturday, starting 8 weeks
    // before the last Saturday on or before (lastDate + 1 week) and ending before that date.

    it("builds 9 bands for a Monday, starting on Friday 2023-11-24 at noon", () => {
      const bands = buildWeekendPlotBands(LocalDate.of(2024, 1, 15));

      expect(bands).toHaveLength(9);
      expect(bands?.[0]).toEqual({
        from: 1700827200000, // 2023-11-24T12:00:00Z
        to: 1701000000000, // 2023-11-26T12:00:00Z
        color: "var(--chart-weekend-band)",
        zIndex: 1,
      });
      expect(bands?.[8].from).toBe(1705665600000); // 2024-01-19T12:00:00Z
    });

    it("makes every band 48 hours wide and one week apart", () => {
      const bands = buildWeekendPlotBands(LocalDate.of(2024, 1, 15)) ?? [];

      for (const band of bands) {
        expect((band.to as number) - (band.from as number)).toBe(2 * DAY);
      }
      for (let i = 1; i < bands.length; i++) {
        expect((bands[i].from as number) - (bands[i - 1].from as number)).toBe(WEEK);
      }
    });

    it("builds 8 bands for a Saturday because the end date is itself a Saturday", () => {
      const bands = buildWeekendPlotBands(LocalDate.of(2024, 1, 20));

      expect(bands).toHaveLength(8);
      expect(bands?.[0].from).toBe(1701432000000); // 2023-12-01T12:00:00Z
      expect(bands?.[7].from).toBe(1705665600000); // 2024-01-19T12:00:00Z
    });
  });

  describe("build4WeekOptions", () => {
    it("adds trend, diamonds, sinkers and projection series in order", () => {
      const options = createOptions();

      build4WeekOptions(options, createBuilderOptions());

      expect(seriesIds(options)).toEqual(["trend", "actual", "estimated", "actual-sinkers", "estimated-sinkers", "projection"]);
      expect(seriesTypes(options)).toEqual(["line", "line", "line", "hlc", "hlc", "line"]);
      expect((options.series?.[1] as SeriesLineOptions).marker?.symbol).toBe("diamond");
      expect((options.series?.[2] as SeriesLineOptions).marker?.symbol).toBe("diamond");
    });

    it("sets weekly ticks, a 33-day range and the weekend bands for the last measurement", () => {
      const options = createOptions();

      build4WeekOptions(options, createBuilderOptions());

      expect(xAxis(options).tickInterval).toBe(WEEK);
      expect(xAxis(options).range).toBe(33 * DAY);
      expect(xAxis(options).plotBands).toEqual(buildWeekendPlotBands(LocalDate.of(2024, 1, 15)));
      expect(xAxis(options).plotBands).toHaveLength(9);
    });

    it("keeps the same six series on narrow displays with smaller diamonds", () => {
      const options = createOptions();

      build4WeekOptions(options, createBuilderOptions({ isNarrow: true }));

      expect(seriesIds(options)).toEqual(["trend", "actual", "estimated", "actual-sinkers", "estimated-sinkers", "projection"]);
      expect((options.series?.[1] as SeriesLineOptions).marker?.radius).toBe(3);
      expect((options.series?.[0] as SeriesLineOptions).lineWidth).toBe(1.5);
    });

    it("leaves options alone when series or xAxis is missing", () => {
      const options: Options = {};

      build4WeekOptions(options, createBuilderOptions());

      expect(options).toEqual({});
    });

    it("leaves options alone when xAxis is an array", () => {
      const options: Options = { series: [], xAxis: [{}] };

      build4WeekOptions(options, createBuilderOptions());

      expect(options.series).toEqual([]);
      expect(options.xAxis).toEqual([{}]);
    });
  });

  describe("build3MonthOptions", () => {
    it("adds trend, dots, sinkers and projection series on wide displays", () => {
      const options = createOptions();

      build3MonthOptions(options, createBuilderOptions());

      expect(seriesIds(options)).toEqual(["trend", "actual", "estimated", "actual-sinkers", "estimated-sinkers", "projection"]);
      expect(seriesTypes(options)).toEqual(["line", "line", "line", "hlc", "hlc", "line"]);
      expect((options.series?.[1] as SeriesLineOptions).marker?.symbol).toBe("circle");
    });

    it("adds only trend, line and projection series on narrow displays", () => {
      const options = createOptions();

      build3MonthOptions(options, createBuilderOptions({ isNarrow: true }));

      expect(seriesIds(options)).toEqual(["trend", "actual", "projection"]);
      expect((options.series?.[1] as SeriesLineOptions).marker?.enabled).toBe(false);
    });

    it("sets weekly ticks, a 95-day range and no weekend bands", () => {
      const options = createOptions();

      build3MonthOptions(options, createBuilderOptions());

      expect(xAxis(options).tickInterval).toBe(WEEK);
      expect(xAxis(options).range).toBe(95 * DAY);
      expect(xAxis(options).plotBands).toEqual([]);
    });
  });

  describe("buildLongTermOptions", () => {
    it("replaces any existing series with trend, line and projection", () => {
      const options = createOptions();
      options.series = [{ type: "line", id: "stale", data: [] }];

      buildLongTermOptions(options, createBuilderOptions(), "6m");

      expect(seriesIds(options)).toEqual(["trend", "actual", "projection"]);
      expect(seriesTypes(options)).toEqual(["line", "line", "line"]);
      expect(xAxis(options).plotBands).toEqual([]);
    });

    it.each([
      ["6m", 185 * DAY],
      ["1y", 370 * DAY],
    ] as const)("sets the %s range to %i ms", (timeRange, range) => {
      const options = createOptions();

      buildLongTermOptions(options, createBuilderOptions(), timeRange);

      expect(xAxis(options).range).toBe(range);
    });

    it("sizes the all-time range to the number of trend points plus the projection", () => {
      const options = createOptions();

      buildLongTermOptions(options, createBuilderOptions(), "all");

      // 2 trend points: (2 - 1 + 6) days
      expect(xAxis(options).range).toBe(7 * DAY);
    });
  });

  describe("buildExploreOptions", () => {
    it("adds the 3-month series set and enables the navigator", () => {
      const options = createOptions();

      buildExploreOptions(options, createBuilderOptions());

      expect(seriesIds(options)).toEqual(["trend", "actual", "estimated", "actual-sinkers", "estimated-sinkers", "projection"]);
      expect(options.navigator).toMatchObject({ enabled: true, height: 30, margin: 10 });
      expect(options.scrollbar).toEqual({ liveRedraw: true });
      expect(options.chart?.spacingBottom).toBe(10);
      expect(options.legend?.enabled).toBe(false);
    });

    it("uses the narrow series set on narrow displays", () => {
      const options = createOptions();

      buildExploreOptions(options, createBuilderOptions({ isNarrow: true }));

      expect(seriesIds(options)).toEqual(["trend", "actual", "projection"]);
    });

    it("shows the last six months initially and clears the fixed range", () => {
      const options = createOptions();

      buildExploreOptions(options, createBuilderOptions());

      expect(xAxis(options).min).toBe(1689379200000); // 2023-07-15
      expect(xAxis(options).max).toBe(1705795200000); // 2024-01-21
      expect(xAxis(options).range).toBeUndefined();
      expect(xAxis(options).plotBands).toEqual([]);
    });

    describe("afterSetExtremes handler", () => {
      const handlerFor = (overrides: { isNarrow?: boolean } = {}): ExtremesHandler => {
        const options = createOptions();
        buildExploreOptions(options, createBuilderOptions(overrides));
        return xAxis(options).events?.afterSetExtremes as unknown as ExtremesHandler;
      };

      const invoke = (handler: ExtremesHandler, chart: FakeChart, rangeDays: number) =>
        handler.call({ chart, min: 0, max: rangeDays * DAY }, { min: 0, max: rangeDays * DAY });

      it("removes only the dynamic series, leaving the trend and Highcharts' navigator series alone", () => {
        // Regression (6152d245): the handler used to remove every series except the first, which
        // included Highcharts' internal navigator series; the next teardown then threw.
        const chart = createFakeChart(["trend", ...DYNAMIC_SERIES_IDS, "highcharts-navigator-series"]);

        invoke(handlerFor(), chart, 30);

        const removed = chart.series.filter((s) => s.remove.mock.calls.length > 0).map((s) => s.options.id);
        expect(removed).toEqual([...DYNAMIC_SERIES_IDS]);
        for (const id of DYNAMIC_SERIES_IDS) {
          expect(chart.get(id)?.remove).toHaveBeenCalledWith(false);
        }
      });

      it("adds diamonds, sinkers and the projection for ranges up to 90 days", () => {
        const chart = createFakeChart(["trend", ...DYNAMIC_SERIES_IDS]);

        invoke(handlerFor(), chart, 90);

        const added = addedSeries(chart);
        expect(added.map((s) => s.id)).toEqual(["actual", "estimated", "actual-sinkers", "estimated-sinkers", "projection"]);
        expect(added.map((s) => s.type)).toEqual(["line", "line", "hlc", "hlc", "line"]);
        expect((added[0] as SeriesLineOptions).marker?.symbol).toBe("diamond");
        expect((added[1] as SeriesLineOptions).marker?.symbol).toBe("diamond");
        expect(chart.addSeries.mock.calls.every(([, redraw]) => redraw === false)).toBe(true);
        expect(chart.redraw).toHaveBeenCalledTimes(1);
      });

      it("adds dots, sinkers and the projection for ranges between 91 and 190 days", () => {
        const chart = createFakeChart(["trend", ...DYNAMIC_SERIES_IDS]);

        invoke(handlerFor(), chart, 190);

        const added = addedSeries(chart);
        expect(added.map((s) => s.id)).toEqual(["actual", "estimated", "actual-sinkers", "estimated-sinkers", "projection"]);
        expect((added[0] as SeriesLineOptions).marker?.symbol).toBe("circle");
        expect((added[1] as SeriesLineOptions).marker?.symbol).toBe("circle");
        expect(chart.redraw).toHaveBeenCalledTimes(1);
      });

      it("adds a single line and the projection for medium ranges on narrow displays", () => {
        const chart = createFakeChart(["trend", ...DYNAMIC_SERIES_IDS]);

        invoke(handlerFor({ isNarrow: true }), chart, 120);

        const added = addedSeries(chart);
        expect(added.map((s) => s.id)).toEqual(["actual", "projection"]);
        expect((added[0] as SeriesLineOptions).marker?.enabled).toBe(false);
        expect((added[0] as SeriesLineOptions).lineWidth).toBe(1);
      });

      it("adds a single line and the projection for ranges over 190 days", () => {
        const chart = createFakeChart(["trend", ...DYNAMIC_SERIES_IDS]);

        invoke(handlerFor(), chart, 191);

        const added = addedSeries(chart);
        expect(added.map((s) => s.id)).toEqual(["actual", "projection"]);
        expect((added[0] as SeriesLineOptions).marker?.enabled).toBe(false);
        expect((added[1] as SeriesLineOptions).dashStyle).toBe("ShortDot");
      });

      it("falls back to the axis extremes when the event carries none", () => {
        const chart = createFakeChart(["trend"]);

        handlerFor().call({ chart, min: 0, max: 400 * DAY }, {});

        expect(addedSeries(chart).map((s) => s.id)).toEqual(["actual", "projection"]);
      });

      it("tolerates a navigator change when its series were already removed", () => {
        const chart = createFakeChart([]);

        expect(() => invoke(handlerFor(), chart, 30)).not.toThrow();
        expect(addedSeries(chart)).toHaveLength(5);
        expect(chart.redraw).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("buildYAxisOptions", () => {
    it.each([
      ["weight", true, 3],
      ["weight", false, 5],
      ["fatpercent", true, 5],
      ["fatpercent", false, 5],
    ] as const)("sets minRange for %s mode (metric: %s) to %i", (mode, useMetric, minRange) => {
      const options = createOptions();

      buildYAxisOptions(options, mode, useMetric);

      expect(yAxis(options).minRange).toBe(minRange);
    });

    it.each(["fatmass", "leanmass"] as const)("does not set minRange for %s mode", (mode) => {
      const options = createOptions();

      buildYAxisOptions(options, mode, false, 175);

      expect(yAxis(options).minRange).toBeUndefined();
      expect(yAxis(options).plotBands).toBeUndefined();
      expect(yAxis(options).plotLines).toBeUndefined();
    });

    it("adds a 5 lb goal band and its edge lines for an imperial goal", () => {
      const options = createOptions();

      buildYAxisOptions(options, "weight", false, 175);

      expect(yAxis(options).plotBands).toEqual([
        expect.objectContaining({ from: 172.5, to: 177.5, color: "var(--chart-goal-band)", zIndex: 0, label: expect.objectContaining({ text: "Goal Range" }) }),
      ]);
      expect(yAxis(options).plotLines?.map((line) => line.value)).toEqual([172.5, 177.5]);
      expect(yAxis(options).plotLines?.[0]).toMatchObject({ color: "var(--chart-goal-line)", dashStyle: "ShortDash", zIndex: 1, width: 1 });
    });

    it("adds a 1.134 kg goal band for a metric goal", () => {
      const options = createOptions();

      buildYAxisOptions(options, "weight", true, 80);

      expect(yAxis(options).plotBands?.[0]).toMatchObject({ from: 80 - 1.134, to: 80 + 1.134 });
      expect(yAxis(options).plotLines?.map((line) => line.value)).toEqual([80 - 1.134, 80 + 1.134]);
    });

    it("adds no goal band without a goal weight", () => {
      const options = createOptions();

      buildYAxisOptions(options, "weight", false);

      expect(yAxis(options).minRange).toBe(5);
      expect(yAxis(options).plotBands).toBeUndefined();
      expect(yAxis(options).plotLines).toBeUndefined();
    });

    it("adds no goal band for fat percentage even with a goal weight", () => {
      const options = createOptions();

      buildYAxisOptions(options, "fatpercent", false, 25);

      expect(yAxis(options).plotBands).toBeUndefined();
      expect(yAxis(options).plotLines).toBeUndefined();
    });

    it("leaves options alone when yAxis is missing or an array", () => {
      const withoutYAxis: Options = {};
      const withArrayYAxis: Options = { yAxis: [{}] };

      buildYAxisOptions(withoutYAxis, "weight", false, 175);
      buildYAxisOptions(withArrayYAxis, "weight", false, 175);

      expect(withoutYAxis).toEqual({});
      expect(withArrayYAxis.yAxis).toEqual([{}]);
    });
  });
});
