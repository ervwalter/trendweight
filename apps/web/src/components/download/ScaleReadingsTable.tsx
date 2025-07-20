import { formatMeasurement } from "../../lib/core/numbers";
import { LocalDate, convert } from "@js-joda/core";
import type { ScaleReading } from "./types";

interface ScaleReadingsTableProps {
  readings: ScaleReading[];
  viewType: string;
  useMetric: boolean;
}

// Create formatters once at module level
const dateFormatter = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat([], {
  hour: "numeric",
  minute: "2-digit",
});

const formatDate = (date: LocalDate) => {
  const nativeDate = convert(date).toDate();
  return dateFormatter.format(nativeDate);
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0);
  return timeFormatter.format(date);
};

export function ScaleReadingsTable({ readings, viewType, useMetric }: ScaleReadingsTableProps) {
  const isComputed = viewType === "computed";

  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="pr-6 pb-2 pl-6 text-left font-semibold">Date</th>
            {!isComputed && <th className="pr-6 pb-2 text-left font-semibold">Time</th>}
            <th className="pr-6 pb-2 text-left font-semibold">{isComputed ? "Actual Weight" : "Weight"}</th>
            {isComputed && <th className="pr-6 pb-2 text-left font-semibold">Trend Weight</th>}
            <th className="pr-6 pb-2 text-left font-semibold">{isComputed ? "Actual Fat %" : "Body Fat %"}</th>
            {isComputed && <th className="pr-6 pb-2 text-left font-semibold">Trend Fat %</th>}
          </tr>
        </thead>
        <tbody>
          {readings.map((reading, index) => (
            <tr
              key={`${reading.date.toEpochDay()}-${reading.time || ""}-${index}`}
              className={`border-b border-gray-200 ${index % 2 === 1 ? "bg-gray-100" : ""}`}
            >
              <td className="py-2 pr-6 pl-6" suppressHydrationWarning>
                {formatDate(reading.date)}
              </td>
              {!isComputed && (
                <td className="py-2 pr-6" suppressHydrationWarning>
                  {reading.time ? formatTime(reading.time) : "-"}
                </td>
              )}
              <td className={`py-2 pr-6 ${reading.weightIsInterpolated ? "text-gray-500 italic" : ""}`}>
                {reading.weight !== undefined
                  ? formatMeasurement(reading.weight, {
                      type: "weight",
                      metric: useMetric,
                    })
                  : "-"}
              </td>
              {isComputed && (
                <td className="py-2 pr-6 font-semibold">
                  {reading.trend !== undefined
                    ? formatMeasurement(reading.trend, {
                        type: "weight",
                        metric: useMetric,
                      })
                    : "-"}
                </td>
              )}
              <td className={`py-2 pr-6 ${reading.fatIsInterpolated ? "text-gray-500 italic" : ""}`}>
                {reading.fatRatio !== undefined && reading.fatRatio !== null
                  ? formatMeasurement(reading.fatRatio, {
                      type: "fatpercent",
                      metric: useMetric,
                    })
                  : "-"}
              </td>
              {isComputed && (
                <td className="py-2 pr-6 font-semibold">
                  {reading.fatTrend !== undefined && reading.fatTrend !== null
                    ? formatMeasurement(reading.fatTrend, {
                        type: "fatpercent",
                        metric: useMetric,
                      })
                    : "-"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
