import type { SeriesHlcOptions, SeriesLineOptions } from "highcharts/highstock";
import type { Mode } from "../../core/interfaces";

const getColors = (isDarkMode: boolean) => ({
  weight: isDarkMode ? "#ef4444" : "#8b0000", // Brighter red for trend line in dark mode
  fatpercent: isDarkMode ? "#d946ef" : "#660066", // Brighter purple for trend line in dark mode
  fatmass: isDarkMode ? "#84cc16" : "#336600", // Brighter green for trend line in dark mode
  leanmass: isDarkMode ? "#60a5fa" : "#000066", // Brighter blue for trend line in dark mode
});

export const createTrendSeries = (data: [number, number][], mode: Mode, modeText: string, isNarrow: boolean, isDarkMode = false): SeriesLineOptions => {
  const colors = getColors(isDarkMode);
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

export const createDiamondsSeries = (data: [number, number | null][], isInterpolated: boolean, isNarrow: boolean, isDarkMode = false): SeriesLineOptions => {
  const series = createLineSeries(data, isInterpolated, isDarkMode);
  series.connectNulls = false;
  series.zIndex = 6;
  series.lineWidth = 0;
  series.marker = {
    enabled: true,
    symbol: "diamond",
    lineColor: isDarkMode
      ? isInterpolated
        ? "#2a2a2a"
        : "#737373" // More contrast between interpolated and actual
      : isInterpolated
        ? "#e2e2e2"
        : "#333333",
    fillColor: isDarkMode ? "#171717" : "#ffffff", // Very dark fill for dark mode
    lineWidth: 1,
    radius: isNarrow ? 3 : 4.5,
  };
  return series;
};

export const createDotSeries = (data: [number, number | null][], isInterpolated: boolean, isDarkMode = false): SeriesLineOptions => {
  const series = createLineSeries(data, isInterpolated, isDarkMode);
  series.connectNulls = false;
  series.zIndex = 4;
  series.lineWidth = 0;
  series.marker = {
    enabled: true,
    symbol: "circle",
    lineColor: isDarkMode
      ? isInterpolated
        ? "#2a2a2a"
        : "#737373" // Match diamond contrast
      : isInterpolated
        ? "#e2e2e2"
        : "#333333",
    fillColor: isDarkMode
      ? isInterpolated
        ? "#2a2a2a"
        : "#737373" // Match diamond contrast
      : isInterpolated
        ? "#e2e2e2"
        : "#333333",
    lineWidth: 0,
    radius: 2,
  };
  return series;
};

export const createLineSeries = (data: [number, number | null][], isInterpolated: boolean, isDarkMode = false): SeriesLineOptions => ({
  type: "line",
  id: isInterpolated ? "estimated" : "actual",
  name: isInterpolated ? "Estimated Reading" : "Scale Reading",
  lineWidth: 1,
  color: isDarkMode ? "#525252" : "#aaaaaa", // Darker gray for less contrast in dark mode
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

export const createProjectionSeries = (data: [number, number][], mode: Mode, modeText: string, isNarrow: boolean, isDarkMode = false): SeriesLineOptions => {
  const colors = getColors(isDarkMode);
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

export const createSinkersSeries = (data: [number, number | null, number | null, null][], isInterpolated: boolean, isDarkMode = false): SeriesHlcOptions => ({
  type: "hlc",
  id: isInterpolated ? "estimated-sinkers" : "actual-sinkers",
  name: isInterpolated ? "Estimated Sinkers" : "Actual Sinkers",
  showInLegend: false,
  enableMouseTracking: false,
  zIndex: 2,
  color: isDarkMode
    ? isInterpolated
      ? "#2a2a2a"
      : "#525252" // Better contrast for dark mode
    : isInterpolated
      ? "#e2e2e2"
      : "#999999",
  pointValKey: "high",
  data,
});
