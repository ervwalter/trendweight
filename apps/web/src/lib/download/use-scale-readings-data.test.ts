import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { LocalDate } from "@js-joda/core";
import { http } from "msw";
import { server } from "@/test/mocks/server";
import { json, recordRequests } from "@/test/msw";
import { mockAuth } from "@/test/auth";
import { createQueryWrapper } from "@/test/render";
import { createTestQueryClient } from "@/test/query-client";
import { buildComputedMeasurement, buildMeasurementsResponse, buildProfileResponse, buildSourceData } from "@/test/fixtures";
import type { ApiSourceData, MeasurementsResponse } from "@/lib/api/types";
import { useScaleReadingsData } from "./use-scale-readings-data";

vi.mock("@/lib/auth/use-auth");

type SourceMeasurement = NonNullable<ApiSourceData["measurements"]>[number];

// Withings readings: two on 2024-01-15 (morning and afternoon) and one on 2024-01-16
const withingsMeasurements: SourceMeasurement[] = [
  { date: "2024-01-15", time: "08:30:00", weight: 80, fatRatio: 0.225 },
  { date: "2024-01-16", time: "08:00:00", weight: 75.3, fatRatio: 0.223 },
  { date: "2024-01-15", time: "14:00:00", weight: 75.7 },
];

function givenApi({
  useMetric,
  sourceData,
  computedMeasurements,
}: {
  useMetric: boolean;
  sourceData?: ApiSourceData[];
  computedMeasurements?: MeasurementsResponse["computedMeasurements"];
}) {
  server.use(
    http.get("/api/profile", () => json(200, buildProfileResponse({ user: { useMetric } }))),
    http.get("/api/data", () =>
      json(
        200,
        buildMeasurementsResponse({
          computedMeasurements: computedMeasurements ?? [buildComputedMeasurement()],
          sourceData: sourceData ?? [buildSourceData({ measurements: withingsMeasurements })],
        }),
      ),
    ),
  );
}

async function renderReadings(view: string, newestFirst = false) {
  const wrapper = createQueryWrapper(createTestQueryClient(), { syncProgress: true });
  const rendered = renderHook(() => useScaleReadingsData(view, newestFirst), { wrapper });
  await waitFor(() => expect(rendered.result.current).not.toBeNull());
  return rendered;
}

describe("useScaleReadingsData", () => {
  beforeEach(() => {
    mockAuth();
  });

  it("requests the download data with source readings included", async () => {
    givenApi({ useMetric: true });
    const requests = recordRequests();

    await renderReadings("withings");

    const [dataRequest] = requests.byPath("/api/data");
    expect(dataRequest.method).toBe("GET");
    expect(new URLSearchParams(dataRequest.search).get("includeSource")).toBe("true");
  });

  describe("unit conversion", () => {
    it("converts provider weights from kilograms to pounds for an imperial profile", async () => {
      givenApi({ useMetric: false, sourceData: [buildSourceData({ measurements: [withingsMeasurements[0]] })] });

      const { result } = await renderReadings("withings");

      expect(result.current.readings).toHaveLength(1);
      expect(result.current.readings[0].weight).toBeCloseTo(176.37, 2);
      // Fat is a ratio and has no unit, so it passes through untouched
      expect(result.current.readings[0].fatRatio).toBe(0.225);
    });

    it("converts computed weights and trends to pounds while leaving fat ratios alone", async () => {
      givenApi({
        useMetric: false,
        computedMeasurements: [buildComputedMeasurement({ actualWeight: 80, trendWeight: 80.5, actualFatPercent: 0.225, trendFatPercent: 0.23 })],
      });

      const { result } = await renderReadings("computed");

      expect(result.current.readings).toHaveLength(1);
      const [reading] = result.current.readings;
      expect(reading.weight).toBeCloseTo(176.37, 2);
      expect(reading.trend).toBeCloseTo(177.47, 2);
      expect(reading.fatRatio).toBe(0.225);
      expect(reading.fatTrend).toBe(0.23);
    });

    it("keeps kilograms unchanged for a metric profile", async () => {
      givenApi({ useMetric: true, sourceData: [buildSourceData({ measurements: [{ date: "2024-01-15", time: "08:30:00", weight: 75.5, fatRatio: 0.225 }] })] });

      const { result } = await renderReadings("withings");

      expect(result.current.readings[0].weight).toBe(75.5);
    });

    it("returns the profile it converted with", async () => {
      givenApi({ useMetric: false });

      const { result } = await renderReadings("computed");

      expect(result.current.profile?.useMetric).toBe(false);
      expect(result.current.profile?.firstName).toBe("Alex");
    });
  });

  describe("computed view", () => {
    const computed = [
      buildComputedMeasurement({ date: "2024-01-15", actualWeight: 75.5, trendWeight: 75.2, actualFatPercent: 0.225, trendFatPercent: 0.223 }),
      buildComputedMeasurement({
        date: "2024-01-16",
        actualWeight: 75.3,
        trendWeight: 75.25,
        actualFatPercent: undefined,
        trendFatPercent: undefined,
        weightIsInterpolated: true,
      }),
      buildComputedMeasurement({ date: "2024-01-14", actualWeight: 75.8, trendWeight: 75.4, actualFatPercent: 0.225, trendFatPercent: 0.223 }),
    ];

    it("maps computed measurements oldest first by default", async () => {
      givenApi({ useMetric: true, computedMeasurements: computed });

      const { result } = await renderReadings("computed");

      expect(result.current.readings).toHaveLength(3);
      expect(result.current.readings[0]).toEqual({
        date: LocalDate.of(2024, 1, 14),
        weight: 75.8,
        trend: 75.4,
        fatRatio: 0.225,
        fatTrend: 0.223,
        weightIsInterpolated: false,
        fatIsInterpolated: false,
      });
      expect(result.current.readings.map((r) => r.date.toString())).toEqual(["2024-01-14", "2024-01-15", "2024-01-16"]);
    });

    it("sorts newest first when requested", async () => {
      givenApi({ useMetric: true, computedMeasurements: computed });

      const { result } = await renderReadings("computed", true);

      expect(result.current.readings.map((r) => r.date.toString())).toEqual(["2024-01-16", "2024-01-15", "2024-01-14"]);
    });

    it("carries the interpolation flags through", async () => {
      givenApi({ useMetric: true, computedMeasurements: computed });

      const { result } = await renderReadings("computed");

      const interpolated = result.current.readings.find((r) => r.date.equals(LocalDate.of(2024, 1, 16)));
      expect(interpolated?.weightIsInterpolated).toBe(true);
      expect(interpolated?.fatIsInterpolated).toBe(false);
    });

    it("reverses the order when the sort direction changes", async () => {
      givenApi({ useMetric: true, computedMeasurements: computed });
      const wrapper = createQueryWrapper(createTestQueryClient(), { syncProgress: true });
      const { result, rerender } = renderHook(({ newestFirst }) => useScaleReadingsData("computed", newestFirst), {
        wrapper,
        initialProps: { newestFirst: false },
      });
      await waitFor(() => expect(result.current).not.toBeNull());
      const oldestFirst = result.current.readings;

      rerender({ newestFirst: true });

      expect(result.current.readings).toEqual([...oldestFirst].reverse());
    });

    it("returns no readings when there are no computed measurements", async () => {
      givenApi({ useMetric: true, computedMeasurements: [] });

      const { result } = await renderReadings("computed");

      expect(result.current.readings).toEqual([]);
    });
  });

  describe("provider view", () => {
    it("sorts same-day readings by time, oldest first", async () => {
      givenApi({ useMetric: true });

      const { result } = await renderReadings("withings");

      expect(result.current.readings).toHaveLength(3);
      expect(result.current.readings[0]).toEqual({
        date: LocalDate.of(2024, 1, 15),
        time: "08:30:00",
        weight: 80,
        fatRatio: 0.225,
        provider: "withings",
      });
      expect(result.current.readings[1]).toEqual({
        date: LocalDate.of(2024, 1, 15),
        time: "14:00:00",
        weight: 75.7,
        fatRatio: undefined,
        provider: "withings",
      });
      expect(result.current.readings[2].date).toEqual(LocalDate.of(2024, 1, 16));
    });

    it("sorts same-day readings by time, newest first", async () => {
      givenApi({ useMetric: true });

      const { result } = await renderReadings("withings", true);

      expect(result.current.readings.map((r) => `${r.date} ${r.time}`)).toEqual(["2024-01-16 08:00:00", "2024-01-15 14:00:00", "2024-01-15 08:30:00"]);
    });

    it("drops the placeholder time for manual entries", async () => {
      givenApi({
        useMetric: true,
        sourceData: [
          buildSourceData({ source: "manual", measurements: [{ date: "2024-01-15", time: "12:00:00", weight: 75.5 }] }),
          buildSourceData({ source: "withings", measurements: [{ date: "2024-01-15", time: "08:30:00", weight: 80 }] }),
        ],
      });

      const manual = await renderReadings("manual");
      const withings = await renderReadings("withings");

      expect(manual.result.current.readings).toHaveLength(1);
      expect(manual.result.current.readings[0].time).toBeUndefined();
      expect(manual.result.current.readings[0].provider).toBe("manual");
      expect(withings.result.current.readings[0].time).toBe("08:30:00");
    });

    it("sorts manual entries without times by date", async () => {
      givenApi({
        useMetric: true,
        sourceData: [
          buildSourceData({
            source: "manual",
            measurements: [
              { date: "2024-01-16", time: "12:00:00", weight: 75.3 },
              { date: "2024-01-15", time: "12:00:00", weight: 75.5 },
            ],
          }),
        ],
      });

      const { result } = await renderReadings("manual");

      expect(result.current.readings.map((r) => r.date.toString())).toEqual(["2024-01-15", "2024-01-16"]);
    });

    it("maps a null weight to undefined", async () => {
      givenApi({
        useMetric: false,
        sourceData: [buildSourceData({ measurements: [{ date: "2024-01-15", time: "08:30:00", weight: null as unknown as number, fatRatio: 0.225 }] })],
      });

      const { result } = await renderReadings("withings");

      expect(result.current.readings).toHaveLength(1);
      expect(result.current.readings[0].weight).toBeUndefined();
      expect(result.current.readings[0].fatRatio).toBe(0.225);
    });

    it("keeps a zero weight and zero fat ratio instead of dropping them", async () => {
      givenApi({ useMetric: true, sourceData: [buildSourceData({ measurements: [{ date: "2024-01-15", time: "08:30:00", weight: 0, fatRatio: 0 }] })] });

      const { result } = await renderReadings("withings");

      expect(result.current.readings[0].weight).toBe(0);
      expect(result.current.readings[0].fatRatio).toBe(0);
    });

    it("returns no readings for a provider that is not in the response", async () => {
      givenApi({ useMetric: true });

      const { result } = await renderReadings("unknown");

      expect(result.current.readings).toEqual([]);
    });

    it("returns no readings when the response has no source data", async () => {
      givenApi({ useMetric: true, sourceData: [] });

      const { result } = await renderReadings("withings");

      expect(result.current.readings).toEqual([]);
    });

    it("returns no readings when the provider has no measurements", async () => {
      givenApi({ useMetric: true, sourceData: [buildSourceData({ measurements: [] })] });

      const { result } = await renderReadings("withings");

      expect(result.current.readings).toEqual([]);
    });
  });
});
