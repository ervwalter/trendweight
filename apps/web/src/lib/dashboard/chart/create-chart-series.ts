import type { SeriesHlcOptions, SeriesLineOptions } from "highcharts/highstock";
import type { Mode } from "../../core/interfaces";

const getColors = () => ({
  weight: "var(--chart-weight)",
  fatpercent: "var(--chart-fatpercent)",
  fatmass: "var(--chart-fatmass)",
  leanmass: "var(--chart-leanmass)",
});

export const createTrendSeries = (data: [number, number][], mode: Mode, modeText: string, isNarrow: boolean): SeriesLineOptions => {
  const colors = getColors();
  return {
    type: "line",
    id: "trend",
    name: `${modeText} Trend`,
    data,
    color: colors[mode],
    lineWidth: isNarrow ? 1.5 : 2,
    zIndex: 5,
    legendIndex: 1,
    marker: {
      enabled: false,
    },
    events: {
      legendItemClick: () => false,
    },
  };
};

export const createDiamondsSeries = (data: [number, number | null][], isInterpolated: boolean, isNarrow: boolean): SeriesLineOptions => {
  const series = createLineSeries(data, isInterpolated);
  series.connectNulls = false;
  series.zIndex = 6;
  series.lineWidth = 0;
  series.marker = {
    enabled: true,
    symbol: "diamond",
    lineColor: isInterpolated ? "var(--chart-interpolated-diamond)" : "var(--chart-actual-diamond)",
    fillColor: "var(--chart-diamond-fill)",
    lineWidth: 1,
    radius: isNarrow ? 3 : 4.5,
  };
  return series;
};

export const createDotSeries = (data: [number, number | null][], isInterpolated: boolean): SeriesLineOptions => {
  const series = createLineSeries(data, isInterpolated);
  series.connectNulls = false;
  series.zIndex = 4;
  series.lineWidth = 0;
  series.marker = {
    enabled: true,
    symbol: "circle",
    lineColor: isInterpolated ? "var(--chart-interpolated-dot)" : "var(--chart-actual-dot)",
    fillColor: isInterpolated ? "var(--chart-interpolated-dot)" : "var(--chart-actual-dot)",
    lineWidth: 0,
    radius: 2,
  };
  return series;
};

export const createLineSeries = (data: [number, number | null][], isInterpolated: boolean): SeriesLineOptions => ({
  type: "line",
  id: isInterpolated ? "estimated" : "actual",
  name: isInterpolated ? "Estimated Reading" : "Scale Reading",
  lineWidth: 1,
  color: "var(--chart-actual-line)",
  legendIndex: 0,
  zIndex: 3,
  connectNulls: true,
  showInLegend: !isInterpolated,
  marker: {
    enabled: false,
  },
  data,
  events: {
    legendItemClick: () => false,
  },
});

export const createProjectionSeries = (data: [number, number][], mode: Mode, modeText: string, isNarrow: boolean): SeriesLineOptions => {
  const colors = getColors();
  return {
    type: "line",
    id: "projection",
    name: `Projected ${modeText}`,
    data,
    color: colors[mode],
    lineWidth: isNarrow ? 1.5 : 2,
    dashStyle: "ShortDot",
    enableMouseTracking: false,
    zIndex: 5,
    legendIndex: 2,
    events: {
      legendItemClick: () => false,
    },
  };
};

export const createSinkersSeries = (data: [number, number | null, number | null, null][], isInterpolated: boolean): SeriesHlcOptions => ({
  type: "hlc",
  id: isInterpolated ? "estimated-sinkers" : "actual-sinkers",
  name: isInterpolated ? "Estimated Sinkers" : "Actual Sinkers",
  showInLegend: false,
  enableMouseTracking: false,
  zIndex: 2,
  color: isInterpolated ? "var(--chart-interpolated-sinker)" : "var(--chart-actual-sinker)",
  pointValKey: "high",
  data,
});
