import { describe, it, expect, vi } from "vitest";
import chartOptionsTemplate from "./options-template";
import { formatNumber } from "@/lib/core/numbers";

// Mock Highstock
vi.mock("highcharts/highstock", () => ({
  default: {
    dateFormat: vi.fn((_format: string, timestamp: number) => {
      const date = new Date(timestamp);
      return date.toDateString(); // Simplified for testing
    }),
  },
}));

// Mock formatNumber
vi.mock("@/lib/core/numbers", () => ({
  formatNumber: vi.fn((num: number) => num.toFixed(1)),
}));

describe("chartOptionsTemplate", () => {
  it("should return a valid Highcharts options object", () => {
    const options = chartOptionsTemplate();

    expect(options).toBeDefined();
    expect(options.chart).toBeDefined();
    expect(options.series).toEqual([]);
  });

  describe("chart configuration", () => {
    it("should have correct chart settings", () => {
      const options = chartOptionsTemplate();

      expect(options.chart).toEqual({
        plotBorderWidth: 0.25,
        plotBorderColor: "var(--border)",
        backgroundColor: "var(--background)",
        panning: { enabled: false },
        spacingBottom: 40,
        spacingRight: 0,
        spacingLeft: 0,
        ignoreHiddenSeries: false,
        animation: true,
        height: "56%",
      });
    });

    it("should disable accessibility", () => {
      const options = chartOptionsTemplate();
      expect(options.accessibility).toEqual({ enabled: false });
    });

    it("should disable credits", () => {
      const options = chartOptionsTemplate();
      expect(options.credits).toEqual({ enabled: false });
    });

    it("should disable exporting", () => {
      const options = chartOptionsTemplate();
      expect(options.exporting).toEqual({ enabled: false });
    });

    it("should disable navigator", () => {
      const options = chartOptionsTemplate();
      expect(options.navigator).toEqual({ enabled: false });
    });

    it("should disable range selector", () => {
      const options = chartOptionsTemplate();
      expect(options.rangeSelector).toEqual({ enabled: false });
    });

    it("should disable scrollbar", () => {
      const options = chartOptionsTemplate();
      expect(options.scrollbar).toEqual({ enabled: false });
    });
  });

  describe("legend configuration", () => {
    it("should enable legend with correct settings", () => {
      const options = chartOptionsTemplate();

      expect(options.legend).toEqual({
        backgroundColor: "var(--background)",
        enabled: true,
        y: 40,
        itemStyle: {
          color: "var(--foreground)",
        },
        itemHoverStyle: {
          color: "var(--foreground)",
        },
      });
    });
  });

  describe("plot options", () => {
    it("should configure series animation", () => {
      const options = chartOptionsTemplate();

      expect(options.plotOptions?.series?.animation).toEqual({
        duration: 300,
      });
    });

    it("should enable clipping", () => {
      const options = chartOptionsTemplate();
      expect(options.plotOptions?.series?.clip).toBe(true);
    });

    it("should disable legend item click", () => {
      const options = chartOptionsTemplate();
      const clickHandler = options.plotOptions?.series?.events?.legendItemClick;

      expect(clickHandler).toBeDefined();
      if (typeof clickHandler === "function") {
        // The function returns false to prevent default legend item click behavior
        const result = (clickHandler as any)();
        expect(result).toBe(false);
      }
    });

    it("should configure hover and inactive states", () => {
      const options = chartOptionsTemplate();

      expect(options.plotOptions?.series?.states?.hover).toEqual({
        enabled: false,
      });
      expect(options.plotOptions?.series?.states?.inactive).toEqual({
        opacity: 1,
      });
    });
  });

  describe("tooltip formatter", () => {
    it("should format tooltip correctly", () => {
      const options = chartOptionsTemplate();
      const formatter = options.tooltip?.formatter;

      expect(formatter).toBeDefined();

      // Create mock context
      const context = {
        x: 1642339200000, // January 16, 2022
        points: [
          {
            series: { name: "Weight", type: "line" },
            color: "#0066cc",
            y: 75.5,
          },
          {
            series: { name: "Trend", type: "line" },
            color: "#ff6600",
            y: 75.2,
          },
        ],
      };

      const result = formatter?.call(context as any, {} as any);

      expect(result).toContain("Weight:");
      expect(result).toContain("75.5");
      expect(result).toContain("Trend:");
      expect(result).toContain("75.2");
      expect(vi.mocked(formatNumber)).toHaveBeenCalledWith(75.5);
      expect(vi.mocked(formatNumber)).toHaveBeenCalledWith(75.2);
    });

    it("should skip ohlc series in tooltip", () => {
      const options = chartOptionsTemplate();
      const formatter = options.tooltip?.formatter;

      const context = {
        x: 1642339200000,
        points: [
          {
            series: { name: "Weight Range", type: "ohlc" },
            color: "#cccccc",
            y: 75.5,
          },
          {
            series: { name: "Trend", type: "line" },
            color: "#ff6600",
            y: 75.2,
          },
        ],
      };

      const result = formatter?.call(context as any, {} as any);

      expect(result).not.toContain("Weight Range");
      expect(result).toContain("Trend");
    });

    it("should handle formatter errors gracefully", () => {
      const options = chartOptionsTemplate();
      const formatter = options.tooltip?.formatter;

      // Mock a context that will cause an error inside the try block
      const context = {
        x: 1642339200000,
        points: [
          {
            series: { name: null }, // This will cause an error when accessing properties
            color: null,
            y: null,
          },
        ],
      };

      // Override reduce to throw an error
      context.points.reduce = () => {
        throw new Error("Test error");
      };

      const result = formatter?.call(context as any, {} as any);
      expect(result).toBe("");
    });

    it("should handle empty points array", () => {
      const options = chartOptionsTemplate();
      const formatter = options.tooltip?.formatter;

      const context = {
        x: 1642339200000,
        points: [],
      };

      const result = formatter?.call(context as any, {} as any);
      expect(result).toBeDefined();
      expect(result).not.toBe("");
    });
  });

  describe("xAxis configuration", () => {
    it("should configure x-axis units", () => {
      const options = chartOptionsTemplate();

      expect(options.xAxis).toBeDefined();
      expect((options.xAxis as any).units).toEqual([
        ["hour", [1, 2, 3, 4, 6, 8, 12]],
        ["day", [1]],
        ["week", [1]],
        ["month", [1, 3, 6]],
        ["year", [1]],
      ]);
    });

    it("should enable crosshair", () => {
      const options = chartOptionsTemplate();
      expect((options.xAxis as any).crosshair).toBe(true);
    });

    it("should disable ordinal", () => {
      const options = chartOptionsTemplate();
      expect((options.xAxis as any).ordinal).toBe(false);
    });

    it("should set line width to 0", () => {
      const options = chartOptionsTemplate();
      expect((options.xAxis as any).lineWidth).toBe(0);
    });

    it("should configure date time label formats", () => {
      const options = chartOptionsTemplate();
      const formats = (options.xAxis as any).dateTimeLabelFormats;

      expect(formats).toEqual({
        second: "%H:%M:%S",
        minute: "%H:%M",
        hour: "%H:%M",
        day: "%b %e",
        week: "%b %e",
        month: "%b '%y",
        year: "%Y",
      });
    });
  });

  describe("yAxis configuration", () => {
    it("should configure y-axis settings", () => {
      const options = chartOptionsTemplate();

      expect(options.yAxis).toEqual({
        allowDecimals: false,
        showFirstLabel: false,
        showLastLabel: false,
        endOnTick: true,
        startOnTick: true,
        lineWidth: 0,
        gridLineWidth: 0.5,
        gridLineColor: "var(--border)",
        gridZIndex: 0,
        labels: {
          x: -4,
          y: 4,
          align: "right",
          style: {
            color: "var(--muted-foreground)",
          },
        },
      });
    });
  });

  it("should initialize with empty series array", () => {
    const options = chartOptionsTemplate();
    expect(options.series).toEqual([]);
  });
});
