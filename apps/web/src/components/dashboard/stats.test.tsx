import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Measurement, ProfileData } from "@/lib/core/interfaces";
import { freezeClock } from "@/test/clock";
import { buildMeasurement, buildProfileData } from "@/test/fixtures";
import { renderWithDashboardData } from "@/test/render";
import Stats from "./stats";

// Trend-only measurements: Stats reads trendWeight and date
const trend = (date: string, weight: number): Measurement => buildMeasurement({ date, actualWeight: weight, trendWeight: weight });

// 180 -> 178.6 over one week
const oneWeekImperial = [trend("2024-01-01", 180), trend("2024-01-08", 178.6)];

const imperial = (overrides: Partial<ProfileData> = {}) =>
  buildProfileData({ useMetric: false, goalWeight: undefined, showCalories: false, plannedPoundsPerWeek: undefined, ...overrides });

const metric = (overrides: Partial<ProfileData> = {}) => imperial({ useMetric: true, ...overrides });

const listItems = () => screen.getAllByRole("listitem").map((item) => item.textContent);

describe("Stats", () => {
  beforeEach(() => {
    // Relative goal dates ("on/around" vs "in/around") are computed from today
    freezeClock("2024-01-15T12:00:00");
  });

  describe("goal sentences", () => {
    it("describes how much is left to lose and when the goal will be reached", () => {
      // distance = 178.6 - 170 = 8.6 lb (8.599999999999994 in floating point)
      // days = floor(|8.599999999999994 / -0.2|) = floor(42.99999999999997) = 42, so the goal date
      // is 2024-01-08 + 42 days = 2024-02-19, 35 days from the frozen "today" (<= 180 => "on/around")
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.2,
        measurements: oneWeekImperial,
        profile: imperial({ goalWeight: 170 }),
      });

      expect(listItems()).toEqual([
        "You have been tracking your weight for 7 days.",
        "You have 8.6 lb to lose to reach your goal.",
        "You will reach your goal on/around Feb 19, 2024",
      ]);
    });

    it("describes how much is left to gain when the goal is above the current trend", () => {
      // distance = 178.6 - 190 = -11.4 lb; days = floor(11.4 / 0.15) = 76 => 2024-03-24
      renderWithDashboardData(<Stats />, {
        weightSlope: 0.15,
        measurements: [trend("2024-01-01", 177.5), trend("2024-01-08", 178.6)],
        profile: imperial({ goalWeight: 190 }),
      });

      expect(listItems()).toEqual([
        "You have been tracking your weight for 7 days.",
        "You have 11.4 lb to gain to reach your goal.",
        "You will reach your goal on/around Mar 24, 2024",
      ]);
    });

    it("formats metric distances in kilograms", () => {
      // distance = 79.4 - 75 = 4.4 kg; days = floor(4.4 / 0.09) = floor(48.9) = 48 => 2024-02-25
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.09,
        measurements: [trend("2024-01-01", 80), trend("2024-01-08", 79.4)],
        profile: metric({ goalWeight: 75 }),
      });

      expect(listItems()).toEqual([
        "You have been tracking your weight for 7 days.",
        "You have 4.4 kg to lose to reach your goal.",
        "You will reach your goal on/around Feb 25, 2024",
      ]);
    });

    it("uses the month-and-year form when the goal is more than 180 days away", () => {
      // distance = 20 lb; days = floor(20 / 0.1) = 200 => 2024-07-26, 193 days from today (> 180)
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.1,
        measurements: [trend("2024-01-01", 191), trend("2024-01-08", 190)],
        profile: imperial({ goalWeight: 170 }),
      });

      expect(screen.getByText(/will reach your goal/)).toHaveTextContent("You will reach your goal in/around Jul 2024");
    });

    it("says the goal has been reached when the trend has stayed within the goal range", () => {
      // Imperial goal range is +/- 2.5 lb: 171 and 170 are both inside 167.5..172.5
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.1,
        measurements: [trend("2024-01-01", 171), trend("2024-01-08", 170)],
        profile: imperial({ goalWeight: 170 }),
      });

      expect(listItems()).toEqual(["You have been tracking your weight for 7 days.", "You have reached your goal weight."]);
    });

    it("omits the goal date when the trend is moving away from the goal", () => {
      renderWithDashboardData(<Stats />, {
        weightSlope: 0.2,
        measurements: [trend("2024-01-01", 180), trend("2024-01-08", 181.4)],
        profile: imperial({ goalWeight: 170 }),
      });

      expect(screen.getByText(/to lose to reach your goal/)).toHaveTextContent("You have 11.4 lb to lose to reach your goal.");
      expect(screen.queryByText(/will reach your goal/)).not.toBeInTheDocument();
    });

    it("omits the goal date when it is three or more years away", () => {
      // distance = 79.93 lb at 0.01 lb/day is ~7993 days (~21.9 years)
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.01,
        measurements: [trend("2024-01-01", 180), trend("2024-01-08", 179.93)],
        profile: imperial({ goalWeight: 100 }),
      });

      expect(screen.getByText(/to lose to reach your goal/)).toHaveTextContent("You have 79.9 lb to lose to reach your goal.");
      expect(screen.queryByText(/will reach your goal/)).not.toBeInTheDocument();
    });

    it("omits the goal date for a flat trend instead of dividing by zero", () => {
      renderWithDashboardData(<Stats />, {
        weightSlope: 0,
        measurements: [trend("2024-01-01", 180)],
        profile: imperial({ goalWeight: 170, plannedPoundsPerWeek: -1 }),
      });

      expect(listItems()).toEqual(["You have been tracking your weight for 0 days.", "You have 10.0 lb to lose to reach your goal."]);
    });

    it("omits goal sentences entirely without a goal weight", () => {
      renderWithDashboardData(<Stats />, { weightSlope: -0.2, measurements: oneWeekImperial, profile: imperial() });

      expect(listItems()).toEqual(["You have been tracking your weight for 7 days."]);
    });

    it("uses the third person when viewing someone else's dashboard", () => {
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.2,
        measurements: oneWeekImperial,
        profile: imperial({ goalWeight: 170 }),
        isMe: false,
      });

      expect(listItems()).toEqual([
        "They have been tracking their weight for 7 days.",
        "They have 8.6 lb to lose to reach their goal.",
        "They will reach their goal on/around Feb 19, 2024",
      ]);
    });
  });

  describe("tracking duration", () => {
    const durationText = () => screen.getByText(/been tracking/).textContent;

    it("counts days up to and including one week", () => {
      renderWithDashboardData(<Stats />, { measurements: oneWeekImperial, profile: imperial() });

      expect(durationText()).toBe("You have been tracking your weight for 7 days.");
    });

    it("switches to whole weeks after the first week", () => {
      // 8 days => floor(8 / 7) = 1 week; the source does not singularise the unit
      renderWithDashboardData(<Stats />, { measurements: [trend("2024-01-01", 180), trend("2024-01-09", 179)], profile: imperial() });

      expect(durationText()).toBe("You have been tracking your weight for 1 weeks.");
    });

    it("counts weeks until two calendar months have passed", () => {
      // Jan 1 -> Feb 29 is 1 month 28 days => 59 days => 8 weeks
      renderWithDashboardData(<Stats />, { measurements: [trend("2024-01-01", 180), trend("2024-02-29", 175)], profile: imperial() });

      expect(durationText()).toBe("You have been tracking your weight for 8 weeks.");
    });

    it("switches to months at two calendar months", () => {
      renderWithDashboardData(<Stats />, { measurements: [trend("2024-01-01", 180), trend("2024-03-01", 175)], profile: imperial() });

      expect(durationText()).toBe("You have been tracking your weight for 2 months.");
    });

    it("keeps counting in months until two full years have passed", () => {
      renderWithDashboardData(<Stats />, { measurements: [trend("2022-06-01", 180), trend("2024-01-01", 150)], profile: imperial() });

      expect(durationText()).toBe("You have been tracking your weight for 19 months.");
    });

    it("switches to years at two full years", () => {
      renderWithDashboardData(<Stats />, { measurements: [trend("2022-01-01", 200), trend("2024-01-01", 150)], profile: imperial() });

      expect(durationText()).toBe("You have been tracking your weight for 2 years.");
    });
  });

  describe("calories", () => {
    const calorieItems = () => listItems().filter((text) => text?.includes("cal/day"));

    it("reports the daily deficit and how far it exceeds a maintenance plan", () => {
      // Imperial: -0.2 lb/day * 7 = -1.4 lb/week * 3500 = -4900 cal/week = -700 cal/day
      // Plan 0 => intended 0 cal/week; (-4900 - 0) / 7 = -700 (< 0 => "beyond your plan")
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.2,
        measurements: oneWeekImperial,
        profile: imperial({ showCalories: true, plannedPoundsPerWeek: 0 }),
      });

      expect(calorieItems()).toEqual(["You are burning 700 cal/day more than you are eating.", "You are burning 700 cal/day beyond your plan."]);
    });

    it("tells the user how much more to cut when losing slower than planned", () => {
      // Actual -4900 cal/week; plan -2 lb/week => -7000 cal/week; (-4900 - -7000) / 7 = 300
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.2,
        measurements: oneWeekImperial,
        profile: imperial({ showCalories: true, plannedPoundsPerWeek: -2 }),
      });

      expect(calorieItems()).toEqual(["You are burning 700 cal/day more than you are eating.", "You must cut 300 cal/day to lose 2.0 lb/week."]);
    });

    it("reports a surplus when gaining", () => {
      // +0.1 lb/day * 7 = 0.7 lb/week * 3500 = 2450 cal/week = 350 cal/day surplus
      // Plan -1 lb/week => -3500 cal/week; (2450 - -3500) / 7 = 850
      renderWithDashboardData(<Stats />, {
        weightSlope: 0.1,
        measurements: [trend("2024-01-01", 178), trend("2024-01-08", 178.7)],
        profile: imperial({ showCalories: true, plannedPoundsPerWeek: -1 }),
      });

      expect(calorieItems()).toEqual(["You are burning 350 cal/day less than you are eating.", "You must cut 850 cal/day to lose 1.0 lb/week."]);
    });

    it("describes a maintain plan as maintaining rather than losing 0 lb/week", () => {
      renderWithDashboardData(<Stats />, {
        weightSlope: 0.1,
        measurements: [trend("2024-01-01", 178), trend("2024-01-08", 178.7)],
        profile: imperial({ showCalories: true, plannedPoundsPerWeek: 0 }),
      });

      expect(calorieItems()).toEqual(["You are burning 350 cal/day less than you are eating.", "You must cut 350 cal/day to maintain your weight."]);
    });

    it("converts metric rates to pounds before applying 3500 cal/lb", () => {
      // -0.09 kg/day * 7 = -0.63 kg/week * 2.20462262 = -1.3889 lb/week * 3500 = -4861.2 cal/week
      //   => 694.5 cal/day, displayed as 694
      // Plan -0.5 kg/week * 2.20462262 * 3500 = -3858.1 cal/week
      //   => (-4861.2 - -3858.1) / 7 = -143.3 cal/day beyond plan, displayed as 143
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.09,
        measurements: [trend("2024-01-01", 80), trend("2024-01-08", 79.4)],
        profile: metric({ showCalories: true, plannedPoundsPerWeek: -0.5 }),
      });

      expect(calorieItems()).toEqual(["You are burning 694 cal/day more than you are eating.", "You are burning 143 cal/day beyond your plan."]);
    });

    it("formats the metric plan in kilograms without trailing zeros", () => {
      // Actual -4861.2 cal/week; plan -1 kg/week => -7716.2 cal/week; (-4861.2 - -7716.2) / 7 = 407.9
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.09,
        measurements: [trend("2024-01-01", 80), trend("2024-01-08", 79.4)],
        profile: metric({ showCalories: true, plannedPoundsPerWeek: -1 }),
      });

      expect(calorieItems()).toEqual(["You are burning 694 cal/day more than you are eating.", "You must cut 408 cal/day to lose 1 kg/week."]);
    });

    it("uses the third person for calorie sentences", () => {
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.2,
        measurements: oneWeekImperial,
        profile: imperial({ showCalories: true, plannedPoundsPerWeek: -2 }),
        isMe: false,
      });

      expect(calorieItems()).toEqual(["They are burning 700 cal/day more than they are eating.", "They must cut 300 cal/day to lose 2.0 lb/week."]);
    });

    it("hides calories when the profile turns them off", () => {
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.2,
        measurements: oneWeekImperial,
        profile: imperial({ showCalories: false, plannedPoundsPerWeek: -1 }),
      });

      expect(calorieItems()).toEqual([]);
    });

    it("hides calories without a planned rate", () => {
      renderWithDashboardData(<Stats />, {
        weightSlope: -0.2,
        measurements: oneWeekImperial,
        profile: imperial({ showCalories: true, plannedPoundsPerWeek: undefined }),
      });

      expect(calorieItems()).toEqual([]);
    });

    it("hides calories for a gaining plan", () => {
      renderWithDashboardData(<Stats />, {
        weightSlope: 0.1,
        measurements: [trend("2024-01-01", 178), trend("2024-01-08", 178.7)],
        profile: imperial({ showCalories: true, plannedPoundsPerWeek: 1 }),
      });

      expect(calorieItems()).toEqual([]);
    });
  });
});
