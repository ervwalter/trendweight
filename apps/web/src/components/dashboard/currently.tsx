import { LocalDate } from "@js-joda/core";
import { Modes } from "@/lib/core/interfaces";
import type { DataPoint } from "@/lib/core/interfaces";
import { formatMeasurement } from "@/lib/core/numbers";
import { shortDate } from "@/lib/core/dates";
import ChangeArrow from "./change-arrow";
import { useDashboardData } from "@/lib/dashboard/hooks";

const Currently = () => {
  const {
    dataPoints,
    mode: [mode],
    profile: { useMetric, plannedPoundsPerWeek, goalWeight, goalStart },
  } = useDashboardData();

  if (dataPoints.length === 0) {
    return null;
  }

  let first: DataPoint = dataPoints[0];
  const goalStartDate = goalStart && LocalDate.parse(goalStart);
  if (goalStartDate) {
    const cutoff = goalStartDate.minusDays(1);
    first = dataPoints.find((m) => m.date.isAfter(cutoff)) || first;
  }
  const last = dataPoints[dataPoints.length - 1];
  const difference = last.trend - first.trend;
  let intendedDirection: number;
  if (mode === "weight") {
    intendedDirection = plannedPoundsPerWeek || (goalWeight ? goalWeight - first.trend : -1);
  } else if (mode === "fatpercent" || mode === "fatmass") {
    intendedDirection = -1;
  } else {
    intendedDirection = 1;
  }

  return (
    <div className="flex flex-col pb-0 md:pb-12">
      <div className="text-lg font-light">Current {Modes[mode]}</div>
      <div className="text-4xl font-medium md:text-5xl">{formatMeasurement(last.trend, { type: mode, metric: useMetric })}</div>
      <div className="flex items-center text-2xl">
        <div>{formatMeasurement(difference, { type: mode, metric: useMetric, sign: true })}</div>
        <div className="ml-2">
          <ChangeArrow change={difference} intendedDirection={intendedDirection} />
        </div>
      </div>
      <div className="text-muted-foreground pt-2 text-sm font-light italic">
        {goalStartDate ? `since ${shortDate(goalStartDate)}` : `as of ${shortDate(last.date)}`}
      </div>
    </div>
  );
};

export default Currently;
