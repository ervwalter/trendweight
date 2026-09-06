import { ChronoUnit, LocalDate } from "@js-joda/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDemoData, getDemoProfile } from "./demo-data";

// The source demo data runs from 2011-03-23 to 2011-11-03, one reading per day
const SOURCE_SPAN_DAYS = LocalDate.parse("2011-03-23").until(LocalDate.parse("2011-11-03"), ChronoUnit.DAYS);

// Shifting the fixed 2011 demo dates to end "today" must not gain or lose days when the
// browser's timezone crosses a DST boundary between the source and target windows.
describe("demo data date shifting", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each([
    ["Europe/Berlin", "2026-09-06T00:30:00+02:00"],
    ["Europe/Berlin", "2026-01-15T23:30:00+01:00"],
    ["America/Los_Angeles", "2026-03-20T23:30:00-07:00"],
    ["Pacific/Auckland", "2026-10-10T00:30:00+13:00"],
  ])("keeps one measurement per day ending today in %s (now = %s)", (tz, now) => {
    vi.stubEnv("TZ", tz);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now));

    const { computedMeasurements } = getDemoData();
    const dates = computedMeasurements.map((m) => m.date);
    const today = LocalDate.now();

    expect(new Set(dates).size).toBe(dates.length);
    expect(dates.at(-1)).toBe(today.toString());
    expect(dates[0]).toBe(today.minusDays(SOURCE_SPAN_DAYS).toString());
  });

  it("moves the profile start date by the same offset as the measurements", () => {
    vi.stubEnv("TZ", "Europe/Berlin");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T00:30:00+02:00"));

    const { computedMeasurements } = getDemoData();
    const { goalStart } = getDemoProfile();

    expect(goalStart).toBe(computedMeasurements[0].date);
  });
});
