import { useMemo } from "react";
import { Modes } from "../../core/interfaces";
import { useIsMobile } from "../../hooks/use-media-query";
import type { DashboardData } from "../dashboard-context";
import { transformChartData } from "./data-transformers";
import { build3MonthOptions, build4WeekOptions, buildExploreOptions, buildLongTermOptions, buildYAxisOptions } from "./option-builders";
import chartOptionsTemplate from "./options-template";

export const useChartOptions = (data: DashboardData) => {
  const isNarrow = useIsMobile();

  const {
    dataPoints,
    mode: [mode],
    timeRange: [timeRange],
    activeSlope,
    profile: { useMetric, goalWeight },
  } = data;

  return useMemo(() => {
    const options = chartOptionsTemplate();

    if (isNarrow && options.chart) {
      options.chart.height = "75%";
    }

    const modeText = Modes[mode];
    const lastMeasurement = dataPoints[dataPoints.length - 1];

    // Transform data for all chart types
    const dataArrays = transformChartData(dataPoints, mode, activeSlope);

    // Build options based on time range
    const builderOptions = {
      mode,
      modeText,
      isNarrow,
      lastMeasurement,
      dataArrays,
    };

    if (options.series && options.xAxis && !Array.isArray(options.xAxis)) {
      switch (timeRange) {
        case "4w":
          build4WeekOptions(options, builderOptions);
          break;

        case "3m":
          build3MonthOptions(options, builderOptions);
          break;

        case "6m":
        case "1y":
        case "all":
          buildLongTermOptions(options, builderOptions, timeRange);
          break;

        case "explore":
          buildExploreOptions(options, builderOptions);
          break;
      }
    }

    // Build Y-axis options
    buildYAxisOptions(options, mode, useMetric, goalWeight);

    return options;
  }, [dataPoints, activeSlope, goalWeight, isNarrow, mode, timeRange, useMetric]);
};
