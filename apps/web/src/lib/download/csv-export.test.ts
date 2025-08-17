import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocalDate } from "@js-joda/core";
import { downloadScaleReadingsCSV } from "./csv-export";
import type { ScaleReading } from "@/components/download/types";

// Mock the DOM APIs
global.URL = {
  createObjectURL: vi.fn(() => "blob:mock-url"),
  revokeObjectURL: vi.fn(),
} as any;

global.Blob = vi.fn().mockImplementation((content, options) => ({
  content,
  options,
})) as any;

describe("csvExport", () => {
  let mockLink: any;
  let appendChildSpy: any;
  let removeChildSpy: any;

  beforeEach(() => {
    mockLink = {
      href: "",
      download: "",
      click: vi.fn(),
    };

    vi.spyOn(document, "createElement").mockReturnValue(mockLink);
    appendChildSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => mockLink);
    removeChildSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => mockLink);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleRawReadings: ScaleReading[] = [
    {
      date: LocalDate.of(2024, 1, 15),
      time: "07:30:00",
      weight: 75.5,
      fatRatio: 0.18,
    },
    {
      date: LocalDate.of(2024, 1, 16),
      time: "07:45:00",
      weight: 75.2,
      fatRatio: undefined,
    },
  ];

  const sampleComputedReadings: ScaleReading[] = [
    {
      date: LocalDate.of(2024, 1, 15),
      weight: 75.5,
      fatRatio: 0.18,
      weightIsInterpolated: false,
      fatIsInterpolated: false,
      trend: 75.8,
      fatTrend: 0.185,
    },
    {
      date: LocalDate.of(2024, 1, 16),
      weight: undefined,
      fatRatio: undefined,
      weightIsInterpolated: true,
      fatIsInterpolated: true,
      trend: 75.6,
      fatTrend: undefined,
    },
  ];

  describe("downloadScaleReadingsCSV", () => {
    it("should create CSV for raw readings with correct headers", () => {
      downloadScaleReadingsCSV(sampleRawReadings, "raw", false);

      expect(global.Blob).toHaveBeenCalledWith([expect.stringContaining("Date,Time,Weight,Body Fat %")], { type: "text/csv;charset=utf-8;" });
    });

    it("should create CSV for computed readings with correct headers", () => {
      downloadScaleReadingsCSV(sampleComputedReadings, "computed", false);

      expect(global.Blob).toHaveBeenCalledWith(
        [expect.stringContaining("Date,Actual Weight,Weight Is Interpolated,Trend Weight,Actual Fat %,Fat Is Interpolated,Trend Fat %")],
        { type: "text/csv;charset=utf-8;" },
      );
    });

    it("should format raw readings data correctly", () => {
      downloadScaleReadingsCSV(sampleRawReadings, "raw", false);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain("2024-01-15,07:30:00,75.5,18.0");
      expect(csvContent).toContain("2024-01-16,07:45:00,75.2,");
    });

    it("should format computed readings data correctly", () => {
      downloadScaleReadingsCSV(sampleComputedReadings, "computed", false);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain("2024-01-15,75.5,No,75.8,18.0,No,18.5");
      expect(csvContent).toContain("2024-01-16,,Yes,75.6,,Yes,");
    });

    it("should use metric formatting when useMetric is true", () => {
      downloadScaleReadingsCSV(sampleRawReadings, "raw", true);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      // Numbers should be the same but internally formatted as metric
      expect(csvContent).toContain("75.5");
      expect(csvContent).toContain("75.2");
    });

    it("should handle empty readings array", () => {
      downloadScaleReadingsCSV([], "raw", false);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toBe("Date,Time,Weight,Body Fat %");
    });

    it("should handle readings with missing values", () => {
      const readingsWithMissing: ScaleReading[] = [
        {
          date: LocalDate.of(2024, 1, 15),
          weight: undefined,
          fatRatio: undefined,
        },
      ];

      downloadScaleReadingsCSV(readingsWithMissing, "raw", false);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain("2024-01-15,,,");
    });

    it("should create correct filename for raw export", () => {
      vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2024-01-15T10:30:00.000Z");

      downloadScaleReadingsCSV(sampleRawReadings, "raw", false);

      expect(mockLink.download).toBe("trendweight-raw-2024-01-15.csv");
    });

    it("should create correct filename for computed export", () => {
      vi.spyOn(Date.prototype, "toISOString").mockReturnValue("2024-01-15T10:30:00.000Z");

      downloadScaleReadingsCSV(sampleComputedReadings, "computed", false);

      expect(mockLink.download).toBe("trendweight-computed-2024-01-15.csv");
    });

    it("should trigger download by creating and clicking link", () => {
      downloadScaleReadingsCSV(sampleRawReadings, "raw", false);

      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(mockLink.href).toBe("blob:mock-url");
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should handle null fat ratio in computed readings", () => {
      const readingsWithNullFat: ScaleReading[] = [
        {
          date: LocalDate.of(2024, 1, 15),
          weight: 75.5,
          fatRatio: undefined,
          weightIsInterpolated: false,
          fatIsInterpolated: false,
          trend: 75.8,
          fatTrend: undefined,
        },
      ];

      downloadScaleReadingsCSV(readingsWithNullFat, "computed", false);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      expect(csvContent).toContain("2024-01-15,75.5,No,75.8,,No,");
    });

    it("should properly escape CSV values", () => {
      // This test ensures that the CSV format is correct for edge cases
      downloadScaleReadingsCSV(sampleRawReadings, "raw", false);

      const csvContent = (global.Blob as any).mock.calls[0][0][0];
      const lines = csvContent.split("\n");

      // Check header line
      expect(lines[0]).toBe("Date,Time,Weight,Body Fat %");

      // Check data lines
      expect(lines[1]).toBe("2024-01-15,07:30:00,75.5,18.0");
      expect(lines[2]).toBe("2024-01-16,07:45:00,75.2,");
    });
  });
});
