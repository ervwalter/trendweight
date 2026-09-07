import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Delta, Mode, ProfileData } from "@/lib/core/interfaces";
import { buildDataPoint, buildProfileData } from "@/test/fixtures";
import { renderWithDashboardData } from "@/test/render";
import Deltas from "./deltas";

// The two deltas computeDeltas produces for a 28-day history
const weekAndMonth = (week: number, month: number): Delta[] => [
  { period: 7, description: "last week", delta: week },
  { period: 28, description: "a month ago", delta: month },
];

const imperial = (overrides: Partial<ProfileData> = {}) =>
  buildProfileData({ useMetric: false, plannedPoundsPerWeek: undefined, goalWeight: undefined, firstName: "Sam", ...overrides });

// The only data point Deltas reads is the last one (its trend feeds the goal direction)
const endingAt = (trend: number) => [buildDataPoint("2024-01-15", trend)];

const row = (description: string) => screen.getByText(new RegExp(`^Since ${description}:`));

const modeOf = (mode: Mode): [Mode, (mode: Mode) => void] => [mode, () => {}];

describe("Deltas", () => {
  describe("weight rows", () => {
    it("renders each delta with its signed value and marks losing as positive under a losing plan", () => {
      renderWithDashboardData(<Deltas />, {
        deltas: weekAndMonth(-0.7, -2.1),
        dataPoints: endingAt(180),
        profile: imperial({ plannedPoundsPerWeek: -1 }),
      });

      expect(row("last week")).toHaveTextContent("Since last week: ↓ -0.7 lb");
      expect(row("a month ago")).toHaveTextContent("Since a month ago: ↓ -2.1 lb");
      expect(screen.getAllByLabelText("Positive change")).toHaveLength(2);
      expect(screen.queryByLabelText("Negative change")).not.toBeInTheDocument();
    });

    it("marks gaining as positive when there is no plan and the goal is above the trend", () => {
      renderWithDashboardData(<Deltas />, {
        deltas: weekAndMonth(0.7, 2.1),
        dataPoints: endingAt(180),
        profile: imperial({ goalWeight: 190 }),
      });

      expect(row("last week")).toHaveTextContent("Since last week: ↑ +0.7 lb");
      expect(screen.getAllByLabelText("Positive change")).toHaveLength(2);
    });

    it("marks gaining as negative when there is no plan and the goal is below the trend", () => {
      renderWithDashboardData(<Deltas />, {
        deltas: weekAndMonth(0.7, -2.1),
        dataPoints: endingAt(180),
        profile: imperial({ goalWeight: 170 }),
      });

      expect(within(row("last week")).getByLabelText("Negative change")).toHaveTextContent("↑");
      expect(within(row("a month ago")).getByLabelText("Positive change")).toHaveTextContent("↓");
    });

    it("assumes losing is the goal without a plan or goal weight", () => {
      renderWithDashboardData(<Deltas />, {
        deltas: weekAndMonth(-0.7, 2.1),
        dataPoints: endingAt(180),
        profile: imperial(),
      });

      expect(within(row("last week")).getByLabelText("Positive change")).toBeInTheDocument();
      expect(within(row("a month ago")).getByLabelText("Negative change")).toBeInTheDocument();
    });

    it("formats deltas in kilograms for metric profiles", () => {
      renderWithDashboardData(<Deltas />, {
        deltas: weekAndMonth(-0.9, -2.4),
        dataPoints: endingAt(80),
        profile: imperial({ useMetric: true, plannedPoundsPerWeek: -0.5 }),
      });

      expect(row("last week")).toHaveTextContent("Since last week: ↓ -0.9 kg");
      expect(row("a month ago")).toHaveTextContent("Since a month ago: ↓ -2.4 kg");
    });

    it("renders no arrow for a zero delta", () => {
      renderWithDashboardData(<Deltas />, {
        deltas: weekAndMonth(0, -2.1),
        dataPoints: endingAt(180),
        profile: imperial({ plannedPoundsPerWeek: -1 }),
      });

      expect(row("last week")).toHaveTextContent(/^Since last week: 0\.0 lb$/);
      expect(within(row("last week")).queryByLabelText(/change/)).not.toBeInTheDocument();
      expect(screen.getAllByLabelText(/change/)).toHaveLength(1);
    });

    it("renders no rows when there are no deltas", () => {
      renderWithDashboardData(<Deltas />, { deltas: [], dataPoints: endingAt(180), profile: imperial() });

      expect(screen.queryByText(/^Since /)).not.toBeInTheDocument();
    });
  });

  describe("other modes", () => {
    it("treats a lean mass loss as a negative change", () => {
      renderWithDashboardData(<Deltas />, {
        mode: modeOf("leanmass"),
        deltas: weekAndMonth(-0.5, 0.3),
        dataPoints: endingAt(135),
        profile: imperial({ plannedPoundsPerWeek: -1 }),
      });

      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Lean Mass Changes Over Time");
      expect(row("last week")).toHaveTextContent("Since last week: ↓ -0.5 lb");
      expect(within(row("last week")).getByLabelText("Negative change")).toBeInTheDocument();
      expect(within(row("a month ago")).getByLabelText("Positive change")).toBeInTheDocument();
    });

    it("formats fat percent deltas as percentages and treats a drop as positive", () => {
      renderWithDashboardData(<Deltas />, {
        mode: modeOf("fatpercent"),
        deltas: weekAndMonth(-0.01, 0.005),
        dataPoints: endingAt(0.25),
        profile: imperial(),
      });

      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Fat % Changes Over Time");
      expect(row("last week")).toHaveTextContent("Since last week: ↓ -1.0%");
      expect(row("a month ago")).toHaveTextContent("Since a month ago: ↑ +0.5%");
      expect(within(row("last week")).getByLabelText("Positive change")).toBeInTheDocument();
      expect(within(row("a month ago")).getByLabelText("Negative change")).toBeInTheDocument();
    });

    it("treats a fat mass drop as positive", () => {
      renderWithDashboardData(<Deltas />, {
        mode: modeOf("fatmass"),
        deltas: weekAndMonth(-2.5, -4),
        dataPoints: endingAt(45),
        profile: imperial(),
      });

      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Fat Mass Changes Over Time");
      expect(row("last week")).toHaveTextContent("Since last week: ↓ -2.5 lb");
      expect(screen.getAllByLabelText("Positive change")).toHaveLength(2);
    });
  });

  describe("weekly rate sentence", () => {
    // activeSlope is per day; the sentence shows the absolute weekly rate
    const sentence = () => screen.getByText(/per week$/);

    it("describes a losing rate in pounds", () => {
      renderWithDashboardData(<Deltas />, { activeSlope: -0.1, dataPoints: endingAt(180), profile: imperial() });

      expect(sentence()).toHaveTextContent(/^You are losing 0\.7 lb per week$/);
    });

    it("describes a gaining rate", () => {
      renderWithDashboardData(<Deltas />, { activeSlope: 0.1, dataPoints: endingAt(180), profile: imperial() });

      expect(sentence()).toHaveTextContent(/^You are gaining 0\.7 lb per week$/);
    });

    it("describes the rate in kilograms for metric profiles", () => {
      renderWithDashboardData(<Deltas />, { activeSlope: -0.1, dataPoints: endingAt(80), profile: imperial({ useMetric: true }) });

      expect(sentence()).toHaveTextContent(/^You are losing 0\.7 kg per week$/);
    });

    it("names the body composition measure for non-weight modes", () => {
      renderWithDashboardData(<Deltas />, {
        mode: modeOf("fatpercent"),
        activeSlope: 0.001,
        dataPoints: endingAt(0.25),
        profile: imperial(),
      });

      expect(sentence()).toHaveTextContent(/^You are gaining 0\.7% of body fat per week$/);
    });

    it("uses the owner's first name when viewing someone else's dashboard", () => {
      renderWithDashboardData(<Deltas />, { activeSlope: -0.1, dataPoints: endingAt(180), profile: imperial(), isMe: false });

      expect(sentence()).toHaveTextContent(/^Sam is losing 0\.7 lb per week$/);
    });
  });
});
