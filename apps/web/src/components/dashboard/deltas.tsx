import { Modes } from "@/lib/core/interfaces";
import { formatMeasurement } from "@/lib/core/numbers";
import { useDashboardData } from "@/lib/dashboard/hooks";
import { Heading } from "@/components/common/heading";
import ChangeArrow from "./change-arrow";

const Deltas = () => {
  const {
    deltas,
    mode: [mode],
    dataPoints,
    activeSlope,
    profile: { useMetric, plannedPoundsPerWeek, goalWeight },
  } = useDashboardData();

  if (deltas.length === 0) {
    return null;
  }

  const last = dataPoints[dataPoints.length - 1];
  let intendedDirection: number;
  if (mode === "weight") {
    intendedDirection = plannedPoundsPerWeek || (goalWeight ? goalWeight - last.trend : -1);
  } else if (mode === "fatpercent" || mode === "fatmass") {
    intendedDirection = -1;
  } else {
    intendedDirection = 1;
  }

  const weeklyRate = activeSlope * 7;
  const isGaining = weeklyRate > 0;
  const absFormatted = formatMeasurement(Math.abs(weeklyRate), { type: mode, metric: useMetric, units: true, sign: false });
  let nounPhrase = "";
  if (mode === "fatpercent") {
    nounPhrase = " of body fat";
  } else if (mode === "fatmass") {
    nounPhrase = " of fat mass";
  } else if (mode === "leanmass") {
    nounPhrase = " of lean mass";
  }
  const verb = isGaining ? "gaining" : "losing";

  return (
    <div>
      <Heading level={3} className="mb-3">
        {Modes[mode]} Changes Over Time
      </Heading>
      <div className="mt-2">
        You&apos;re {verb} <strong>{absFormatted}</strong>/week{nounPhrase}
      </div>
      <div className="space-y-1">
        {deltas.map((d) => (
          <div key={d.period}>
            Since {d.description}: <ChangeArrow change={d.delta} intendedDirection={intendedDirection} />{" "}
            {formatMeasurement(d.delta, { type: mode, metric: useMetric, sign: true })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Deltas;
