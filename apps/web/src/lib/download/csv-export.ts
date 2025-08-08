import { formatMeasurement } from "../core/numbers";
import type { ScaleReading, ViewType } from "../../components/download/types";

export function downloadScaleReadingsCSV(readings: ScaleReading[], viewType: ViewType, useMetric: boolean) {
  let headers: string[];

  if (viewType === "computed") {
    headers = ["Date", "Actual Weight", "Weight Is Interpolated", "Trend Weight", "Actual Fat %", "Fat Is Interpolated", "Trend Fat %"];
  } else {
    headers = ["Date", "Time", "Weight", "Body Fat %"];
  }

  const rows = readings.map((reading) => {
    const dateStr = reading.date.toString();
    const weightStr =
      reading.weight !== undefined
        ? formatMeasurement(reading.weight, {
            type: "weight",
            metric: useMetric,
            units: false,
          })
        : "";
    const fatStr =
      reading.fatRatio !== undefined && reading.fatRatio !== null
        ? formatMeasurement(reading.fatRatio, {
            type: "fatpercent",
            metric: useMetric,
            units: false,
          })
        : "";

    if (viewType === "computed") {
      return [
        dateStr,
        weightStr,
        reading.weightIsInterpolated ? "Yes" : "No",
        reading.trend
          ? formatMeasurement(reading.trend, {
              type: "weight",
              metric: useMetric,
              units: false,
            })
          : "",
        fatStr,
        reading.fatIsInterpolated ? "Yes" : "No",
        reading.fatTrend !== undefined && reading.fatTrend !== null
          ? formatMeasurement(reading.fatTrend, {
              type: "fatpercent",
              metric: useMetric,
              units: false,
            })
          : "",
      ];
    } else {
      return [dateStr, reading.time || "", weightStr, fatStr];
    }
  });

  const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `trendweight-${viewType}-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
