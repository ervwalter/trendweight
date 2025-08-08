import { Modes } from "../../lib/core/interfaces";
import { formatMeasurement } from "../../lib/core/numbers";
import { useDashboardData } from "../../lib/dashboard/hooks";
import { Heading } from "../common/heading";
import ChangeArrow from "./change-arrow";

const Deltas = () => {
  const {
    deltas,
    mode: [mode],
    dataPoints,
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

  return (
    <div>
      <Heading level={3} className="mb-3">
        {Modes[mode]} Changes Over Time
      </Heading>
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
