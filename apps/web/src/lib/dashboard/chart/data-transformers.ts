import { LocalDate } from "@js-joda/core";
import { Modes } from "../../core/interfaces";
import type { DashboardData } from "../dashboard-context";

const toEpoch = (date: LocalDate) => date.toEpochDay() * 86400000;

export interface TransformedChartData {
  actualData: [number, number | null][];
  interpolatedData: [number, number | null][];
  trendData: [number, number][];
  projectionsData: [number, number][];
  actualSinkersData: [number, number | null, number | null, null][];
  interpolatedSinkersData: [number, number | null, number | null, null][];
}

export function transformChartData(dataPoints: DashboardData["dataPoints"], mode: keyof typeof Modes, activeSlope: number): TransformedChartData {
  const lastMeasurement = dataPoints[dataPoints.length - 1];

  // Convert to percentage for fat percent mode
  const multiplier = mode === "fatpercent" ? 100 : 1;

  const actualData: [number, number | null][] = dataPoints.map((m) => [toEpoch(m.date), m.isInterpolated ? null : m.actual ? m.actual * multiplier : null]);

  const interpolatedData: [number, number | null][] = dataPoints.map((m) => [
    toEpoch(m.date),
    m.isInterpolated ? (m.actual ? m.actual * multiplier : null) : null,
  ]);

  const trendData: [number, number][] = dataPoints.map((m) => [toEpoch(m.date), m.trend * multiplier]);

  const projectionsData: [number, number][] = [
    [toEpoch(lastMeasurement.date), lastMeasurement.trend * multiplier],
    [toEpoch(lastMeasurement.date.plusDays(6)), (lastMeasurement.trend + activeSlope * 6) * multiplier],
  ];

  const actualSinkersData: [number, number | null, number | null, null][] = dataPoints.map((m) => [
    toEpoch(m.date),
    m.isInterpolated ? null : m.actual ? m.actual * multiplier : null,
    m.isInterpolated ? null : m.trend * multiplier,
    null,
  ]);

  const interpolatedSinkersData: [number, number | null, number | null, null][] = dataPoints.map((m) => [
    toEpoch(m.date),
    m.isInterpolated ? (m.actual ? m.actual * multiplier : null) : null,
    m.isInterpolated ? m.trend * multiplier : null,
    null,
  ]);

  return {
    actualData,
    interpolatedData,
    trendData,
    projectionsData,
    actualSinkersData,
    interpolatedSinkersData,
  };
}
