import type { ScaleReading, ViewType } from "@/components/download/types";

export function downloadScaleReadingsCSV(readings: ScaleReading[], viewType: ViewType) {
  let headers: string[];

  if (viewType === "computed") {
    headers = ["Date", "Actual Weight", "Weight Is Interpolated", "Trend Weight", "Actual Fat %", "Fat Is Interpolated", "Trend Fat %"];
  } else {
    headers = ["Date", "Time", "Weight", "Body Fat %"];
  }

  // Export machine-readable decimals regardless of the browser's display locale.
  // Readings have already been converted to the selected weight unit.
  const formatValue = (value: number | null | undefined, scale = 1) => (value == null ? "" : (value * scale).toFixed(1));
  const rows = readings.map((reading) => {
    const dateStr = reading.date.toString();
    const weightStr = formatValue(reading.weight);
    const fatStr = formatValue(reading.fatRatio, 100);

    if (viewType === "computed") {
      return [
        dateStr,
        weightStr,
        reading.weightIsInterpolated ? "Yes" : "No",
        formatValue(reading.trend),
        fatStr,
        reading.fatIsInterpolated ? "Yes" : "No",
        formatValue(reading.fatTrend, 100),
      ];
    }
    return [dateStr, reading.time || "", weightStr, fatStr];
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
