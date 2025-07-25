import { DayOfWeek, LocalDate } from "@js-joda/core";
import type { Options, XAxisOptions } from "highcharts";
import { Modes } from "../../core/interfaces";
import { createDiamondsSeries, createDotSeries, createLineSeries, createProjectionSeries, createSinkersSeries, createTrendSeries } from "./create-chart-series";

const toEpoch = (date: LocalDate) => date.toEpochDay() * 86400000;

interface ChartDataArrays {
  actualData: [number, number | null][];
  interpolatedData: [number, number | null][];
  trendData: [number, number][];
  projectionsData: [number, number][];
  actualSinkersData: [number, number | null, number | null, null][];
  interpolatedSinkersData: [number, number | null, number | null, null][];
}

interface BuilderOptions {
  mode: keyof typeof Modes;
  modeText: string;
  isNarrow: boolean;
  lastMeasurement: { date: LocalDate; trend: number };
  dataArrays: ChartDataArrays;
}

export function buildWeekendPlotBands(lastMeasurementDate: LocalDate): XAxisOptions["plotBands"] {
  const plotBands: XAxisOptions["plotBands"] = [];
  const endDate = lastMeasurementDate.plusWeeks(1);
  let saturday = endDate;

  while (saturday.dayOfWeek() !== DayOfWeek.SATURDAY) {
    saturday = saturday.plusDays(-1);
  }
  saturday = saturday.plusWeeks(-8);

  while (saturday.isBefore(endDate)) {
    plotBands.push({
      from: toEpoch(saturday) - 43200000, // Friday noon
      to: toEpoch(saturday) + 129600000, // Sunday noon
      color: "rgba(220, 220, 220, 0.2)",
      zIndex: 1,
    });
    saturday = saturday.plusWeeks(1);
  }

  return plotBands;
}

export function build4WeekOptions(options: Options, builderOptions: BuilderOptions): void {
  const { mode, modeText, isNarrow, lastMeasurement, dataArrays } = builderOptions;
  const { actualData, interpolatedData, trendData, projectionsData, actualSinkersData, interpolatedSinkersData } = dataArrays;

  if (options.series && options.xAxis && !Array.isArray(options.xAxis)) {
    options.series.push(createTrendSeries(trendData, mode, modeText, isNarrow));
    options.series.push(createDiamondsSeries(actualData, false, isNarrow));
    options.series.push(createDiamondsSeries(interpolatedData, true, isNarrow));
    options.series.push(createSinkersSeries(actualSinkersData, false));
    options.series.push(createSinkersSeries(interpolatedSinkersData, true));
    options.series.push(createProjectionSeries(projectionsData, mode, modeText, isNarrow));

    options.xAxis.tickInterval = 86400000 * 7;
    options.xAxis.range = 86400000 * (28 - 1 + 6);
    options.xAxis.plotBands = buildWeekendPlotBands(lastMeasurement.date);
  }
}

export function build3MonthOptions(options: Options, builderOptions: BuilderOptions): void {
  const { mode, modeText, isNarrow, dataArrays } = builderOptions;
  const { actualData, interpolatedData, trendData, projectionsData, actualSinkersData, interpolatedSinkersData } = dataArrays;

  if (options.series && options.xAxis && !Array.isArray(options.xAxis)) {
    options.series.push(createTrendSeries(trendData, mode, modeText, isNarrow));

    if (isNarrow) {
      options.series.push(createLineSeries(actualData, false));
    } else {
      options.series.push(createDotSeries(actualData, false));
      options.series.push(createDotSeries(interpolatedData, true));
      options.series.push(createSinkersSeries(actualSinkersData, false));
      options.series.push(createSinkersSeries(interpolatedSinkersData, true));
    }

    options.series.push(createProjectionSeries(projectionsData, mode, modeText, isNarrow));
    options.xAxis.tickInterval = 86400000 * 7;
    options.xAxis.range = 86400000 * (90 - 1 + 6);
    options.xAxis.plotBands = [];
  }
}

export function buildLongTermOptions(options: Options, builderOptions: BuilderOptions, timeRange: "6m" | "1y" | "all"): void {
  const { mode, modeText, isNarrow, dataArrays } = builderOptions;
  const { actualData, trendData, projectionsData } = dataArrays;

  if (options.series && options.xAxis && !Array.isArray(options.xAxis)) {
    options.series = [];
    options.series.push(createTrendSeries(trendData, mode, modeText, isNarrow));
    options.series.push(createLineSeries(actualData, false));
    options.series.push(createProjectionSeries(projectionsData, mode, modeText, isNarrow));

    const rangeDays = timeRange === "6m" ? 180 : timeRange === "1y" ? 365 : trendData.length;
    options.xAxis.range = 86400000 * (rangeDays - 1 + 6);
    options.xAxis.plotBands = [];
  }
}

export function buildExploreOptions(options: Options, builderOptions: BuilderOptions): void {
  const { mode, modeText, isNarrow, lastMeasurement, dataArrays } = builderOptions;
  const { actualData, interpolatedData, trendData, projectionsData, actualSinkersData, interpolatedSinkersData } = dataArrays;

  if (options.series && options.xAxis && !Array.isArray(options.xAxis)) {
    // Initial series setup
    options.series = [];
    options.series.push(createTrendSeries(trendData, mode, modeText, isNarrow));

    if (isNarrow) {
      options.series.push(createLineSeries(actualData, false));
    } else {
      options.series.push(createDotSeries(actualData, false));
      options.series.push(createDotSeries(interpolatedData, true));
      options.series.push(createSinkersSeries(actualSinkersData, false));
      options.series.push(createSinkersSeries(interpolatedSinkersData, true));
    }

    options.series.push(createProjectionSeries(projectionsData, mode, modeText, isNarrow));

    // Chart adjustments
    if (options.chart) {
      options.chart.spacingBottom = 10;
    }

    if (options.legend) {
      options.legend.enabled = false;
    }

    // Set initial range to last 6 months
    const lastDate = lastMeasurement.date;
    const sixMonthsAgo = lastDate.minusMonths(6);
    options.xAxis.min = toEpoch(sixMonthsAgo);
    options.xAxis.max = toEpoch(lastDate.plusDays(6));
    options.xAxis.range = undefined;
    options.xAxis.plotBands = [];

    // Configure navigator
    options.navigator = {
      enabled: true,
      height: 30,
      margin: 10,
      series: {
        type: "line",
        color: "#4a5568",
        lineWidth: 1,
        fillOpacity: 0.1,
      },
      xAxis: {
        labels: {
          style: {
            color: "#718096",
            fontSize: "11px",
            textOutline: "none",
          },
        },
      },
      handles: {
        backgroundColor: "#e2e8f0",
        borderColor: "#a0aec0",
      },
      outlineColor: "#cbd5e0",
      outlineWidth: 1,
      maskFill: "rgba(226, 232, 240, 0.3)",
    };

    options.scrollbar = {
      liveRedraw: true,
    };

    // Add dynamic series update handler
    options.xAxis.events = {
      afterSetExtremes: createAfterSetExtremesHandler(dataArrays, mode, modeText, isNarrow),
    };
  }
}

function createAfterSetExtremesHandler(dataArrays: ChartDataArrays, mode: keyof typeof Modes, modeText: string, isNarrow: boolean) {
  const { actualData, interpolatedData, projectionsData, actualSinkersData, interpolatedSinkersData } = dataArrays;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, e: any) {
    const chart = this.chart;
    const min = e.min !== undefined ? e.min : this.min;
    const max = e.max !== undefined ? e.max : this.max;
    const rangeDays = (max - min) / 86400000;

    // Clear all series except the trend line (series 0)
    while (chart.series.length > 1) {
      chart.series[chart.series.length - 1].remove(false);
    }

    // Add series based on range
    if (rangeDays <= 90) {
      // 90 days or less - diamonds view
      chart.addSeries(createDiamondsSeries(actualData, false, isNarrow), false);
      chart.addSeries(createDiamondsSeries(interpolatedData, true, isNarrow), false);
      chart.addSeries(createSinkersSeries(actualSinkersData, false), false);
      chart.addSeries(createSinkersSeries(interpolatedSinkersData, true), false);
    } else if (rangeDays <= 190) {
      // 91-190 days - dots view
      if (isNarrow) {
        chart.addSeries(createLineSeries(actualData, false), false);
      } else {
        chart.addSeries(createDotSeries(actualData, false), false);
        chart.addSeries(createDotSeries(interpolatedData, true), false);
        chart.addSeries(createSinkersSeries(actualSinkersData, false), false);
        chart.addSeries(createSinkersSeries(interpolatedSinkersData, true), false);
      }
    } else {
      // More than 190 days - line view
      chart.addSeries(createLineSeries(actualData, false), false);
    }

    // Re-add projection series
    chart.addSeries(createProjectionSeries(projectionsData, mode, modeText, isNarrow), false);

    // Redraw once after all series changes
    chart.redraw();
  };
}

export function buildYAxisOptions(options: Options, mode: keyof typeof Modes, useMetric: boolean, goalWeight?: number): void {
  if (!options.yAxis || Array.isArray(options.yAxis)) return;

  // Set minimum y-axis range based on mode and units
  if (mode === "fatpercent") {
    options.yAxis.minRange = 5;
  } else if (mode === "weight") {
    options.yAxis.minRange = useMetric ? 3 : 5;
  }

  // Goal bands for weight mode
  if (mode === "weight" && goalWeight) {
    const goalWidth = useMetric ? 1.134 : 2.5;

    options.yAxis.plotBands = [
      {
        from: goalWeight - goalWidth,
        to: goalWeight + goalWidth,
        color: "rgb(244, 255, 244)",
        label: {
          text: "Goal Range",
          align: "right",
          verticalAlign: "top",
          style: {
            color: "rgb(140, 180, 140)",
            fontSize: "10px",
          },
          x: -4,
          y: 14,
        },
        zIndex: 0,
      },
    ];

    options.yAxis.plotLines = [
      {
        value: goalWeight - goalWidth,
        color: "rgb(100, 150, 100)",
        dashStyle: "ShortDash",
        zIndex: 1,
        width: 1,
      },
      {
        value: goalWeight + goalWidth,
        color: "rgb(100, 150, 100)",
        dashStyle: "ShortDash",
        zIndex: 1,
        width: 1,
      },
    ];
  }
}
