import { ChronoUnit, LocalDate, Period } from "@js-joda/core";
import { shortDate } from "@/lib/core/dates";
import type { Measurement } from "@/lib/core/interfaces";
import { formatNumber, formatPlannedWeight, formatWeight } from "@/lib/core/numbers";
import { useDashboardData } from "@/lib/dashboard/hooks";
import { Heading } from "@/components/common/heading";

const Stats = () => {
  const {
    weightSlope,
    measurements,
    profile: { useMetric, goalWeight, showCalories, plannedPoundsPerWeek, firstName },
    isMe,
  } = useDashboardData();

  const lastMeasurement = measurements[measurements.length - 1];
  const gainPerWeek = weightSlope * 7;

  const duration = calculateDuration(measurements[0].date, lastMeasurement.date);
  const distanceToGoal = calculateDistanceToGoal(measurements, useMetric, goalWeight);
  const dateOfGoal = calculateDateOfGoal(weightSlope, lastMeasurement, goalWeight, distanceToGoal);

  // convert everything to lbs for calorie calculations
  const intendedChangePerWeek = (plannedPoundsPerWeek ?? 0) * (useMetric ? 2.20462262 : 1);
  const intendedCaloriesPerWeek = intendedChangePerWeek * 3500;
  const actualChangePerWeek = gainPerWeek * (useMetric ? 2.20462262 : 1);
  const actualCaloriesPerWeek = actualChangePerWeek * 3500;

  const caloriesVsPlan = (actualCaloriesPerWeek - intendedCaloriesPerWeek) / 7;

  return (
    <div>
      <Heading level={3} className="mb-3">
        Overall Weight Statistics
      </Heading>
      <ul className="space-y-1">
        <li>
          {isMe ? "You are" : `${firstName} is`} {weightSlope > 0 ? "gaining" : "losing"} <strong>{formatWeight(Math.abs(gainPerWeek), useMetric)}/week</strong>{" "}
          of total weight.{" "}
        </li>
        <li className="mt-4">
          {isMe ? "You have" : "They have"} been tracking {isMe ? "your" : "their"} weight for <strong>{duration}</strong>.
        </li>
        {distanceToGoal !== undefined &&
          (distanceToGoal === 0 ? (
            <li>
              {isMe ? "You have" : "They have"} reached {isMe ? "your" : "their"} goal weight.
            </li>
          ) : (
            <>
              <li>
                {isMe ? "You have" : "They have"} <strong>{formatWeight(Math.abs(distanceToGoal), useMetric)}</strong> to {distanceToGoal > 0 ? "lose" : "gain"}{" "}
                to reach {isMe ? "your" : "their"} goal.
              </li>
              {dateOfGoal && LocalDate.now().until(dateOfGoal, ChronoUnit.YEARS) < 3 && (
                <li>
                  {isMe ? "You" : "They"} will reach {isMe ? "your" : "their"} goal around <strong>{shortDate(dateOfGoal)}</strong>
                </li>
              )}
            </>
          ))}
        {showCalories && plannedPoundsPerWeek !== undefined && plannedPoundsPerWeek <= 0 && (
          <>
            <li className="mt-4">
              {isMe ? "You are" : "They are"} burning <strong>{formatNumber(Math.abs(actualCaloriesPerWeek / 7))} cal/day</strong>{" "}
              {weightSlope > 0 ? "less" : "more"} than {isMe ? "you are" : "they are"} eating.
            </li>
            <li>
              {caloriesVsPlan < 0 ? (
                <>
                  {isMe ? "You are" : "They are"} burning <strong>{formatNumber(Math.abs(caloriesVsPlan))} cal/day</strong> beyond {isMe ? "your" : "their"}{" "}
                  plan.
                </>
              ) : (
                <>
                  {isMe ? "You" : "They"} must cut <strong>{formatNumber(Math.abs(caloriesVsPlan))} cal/day</strong> to lose{" "}
                  {formatPlannedWeight(Math.abs(plannedPoundsPerWeek), useMetric)}
                  /week.
                </>
              )}
            </li>
          </>
        )}
      </ul>
    </div>
  );
};

const calculateDuration = (start: LocalDate, end: LocalDate) => {
  const period = Period.between(start, end).normalized();
  const days = start.until(end, ChronoUnit.DAYS);
  const weeks = Math.floor(days / 7);
  const months = period.years() * 12 + period.months();
  const years = period.years();
  let duration;
  if (years > 1) {
    duration = `${years} years`;
  } else if (months > 12) {
    duration = `${months} months`;
  } else if (days > 7) {
    duration = `${weeks} weeks`;
  } else {
    duration = `${days} days`;
  }
  return duration;
};

const calculateDistanceToGoal = (measurements: Measurement[], metric: boolean, goalWeight?: number) => {
  if (!goalWeight) {
    return undefined;
  }

  const goalRange = metric ? 1.134 : 2.5;
  const lastBelowGoal = measurements.findLast((m) => m.trendWeight <= goalWeight);
  const lastAboveGoal = measurements.findLast((m) => m.trendWeight > goalWeight);
  const lastBelowMin = measurements.findLast((m) => m.trendWeight <= goalWeight - goalRange);
  const lastAboveMax = measurements.findLast((m) => m.trendWeight > goalWeight + goalRange);

  if (!lastBelowMin && !lastAboveMax) {
    // weight was never outside of goal range = maintaining
    return 0;
  }

  if (lastAboveMax && (!lastBelowMin || lastAboveMax.date.isAfter(lastBelowMin.date)) && lastBelowGoal && lastBelowGoal.date.isAfter(lastAboveMax.date)) {
    // If was above max more recently the last time was below min,
    // and has been below the goal more recently then when it was above max.
    // In other words, weight is heading down and has passed the goal
    // but not gone below the min.
    // = maintaining
    return 0;
  }

  if (lastBelowMin && (!lastAboveMax || lastBelowMin.date.isAfter(lastAboveMax.date)) && lastAboveGoal && lastAboveGoal.date.isAfter(lastBelowMin.date)) {
    // If was below min more recently the last time was above max,
    // and has been above the goal more recently then when it was below min.
    // In other words, weight is heading up and has passed the goal
    // but not gone above the max.
    // = maintaining
    return 0;
  }

  // not maintaining, so return the difference between current weight and goal
  return measurements[measurements.length - 1].trendWeight - goalWeight;
};

const calculateDateOfGoal = (weightSlope: number, lastMeasurement: Measurement, goalWeight?: number, distanceToGoal?: number) => {
  if (goalWeight && distanceToGoal) {
    const currentWeight = lastMeasurement.trendWeight;
    if (goalWeight && ((weightSlope > 0 && currentWeight < goalWeight) || (weightSlope <= 0 && currentWeight > goalWeight))) {
      // Guard against division by zero or near-zero slopes (e.g., single measurement or flat trend)
      if (Math.abs(weightSlope) < 0.0001) {
        return undefined;
      }
      return lastMeasurement.date.plusDays(Math.floor(Math.abs(distanceToGoal / weightSlope)));
    }
  }
  return undefined;
};

export default Stats;
