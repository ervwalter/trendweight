import { act, screen } from "@testing-library/react";
import { HighchartsReact, type HighchartsReactProps } from "highcharts-react-official";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChartOptions } from "@/lib/dashboard/chart/use-chart-options";
import { useEmbedParams } from "@/lib/hooks/use-embed-params";
import { dailyDataPoints } from "@/test/fixtures";
import { renderWithDashboardData } from "@/test/render";
import Chart from "./chart";

// Highcharts cannot draw in jsdom; capture what the chart would have been created with
vi.mock("highcharts-react-official", () => ({
  HighchartsReact: vi.fn(() => <div data-testid="highcharts" />),
}));
vi.mock("@/lib/hooks/use-embed-params", () => ({ useEmbedParams: vi.fn() }));
// Keep the real hook but record its return values
vi.mock("@/lib/dashboard/chart/use-chart-options", { spy: true });

const HighchartsReactMock = vi.mocked(HighchartsReact);
const useEmbedParamsMock = vi.mocked(useEmbedParams);
const useChartOptionsMock = vi.mocked(useChartOptions);

const LEGEND_RULE = ".highcharts-legend-item { pointer-events: none !important; cursor: default !important; }";

const lastChartProps = (): HighchartsReactProps => {
  const calls = HighchartsReactMock.mock.calls;
  return calls[calls.length - 1][0] as HighchartsReactProps;
};

const fourWeeks = dailyDataPoints(
  "2024-01-01",
  Array.from({ length: 28 }, (_, i) => 80 - i * 0.05),
);

describe("Chart", () => {
  beforeEach(() => {
    useEmbedParamsMock.mockReturnValue({});
    document.documentElement.className = "";
  });

  afterEach(() => {
    document.documentElement.className = "";
  });

  it("creates a stock chart from the options the hook builds for the dashboard data", () => {
    const { data } = renderWithDashboardData(<Chart />, { dataPoints: fourWeeks, weightSlope: -0.05, activeSlope: -0.05 });

    expect(screen.getByTestId("highcharts")).toBeInTheDocument();
    expect(useChartOptionsMock).toHaveBeenCalledWith(data, undefined);
    const props = lastChartProps();
    expect(props.constructorType).toBe("stockChart");
    expect(props.immutable).toBe(true);
    expect(props.options).toBe(useChartOptionsMock.mock.results[0].value);
    expect(props.options?.series?.length).toBeGreaterThan(0);
  });

  it("asks for the shorter embed height when embedded", () => {
    useEmbedParamsMock.mockReturnValue({ embed: true });

    const { data } = renderWithDashboardData(<Chart />, { dataPoints: fourWeeks });

    expect(useChartOptionsMock).toHaveBeenCalledWith(data, "60%");
    expect(lastChartProps().options?.chart?.height).toBe("60%");
  });

  it("disables legend clicks while mounted", () => {
    const { unmount } = renderWithDashboardData(<Chart />, { dataPoints: fourWeeks });

    expect(document.head.innerHTML).toContain(LEGEND_RULE);

    unmount();

    expect(document.head.innerHTML).not.toContain(LEGEND_RULE);
  });

  describe("printing", () => {
    it("drops dark mode for the print run and restores it afterwards", async () => {
      document.documentElement.classList.add("dark");
      renderWithDashboardData(<Chart />, { dataPoints: fourWeeks });

      await act(async () => {
        window.dispatchEvent(new Event("beforeprint"));
      });
      expect(document.documentElement).not.toHaveClass("dark");

      await act(async () => {
        window.dispatchEvent(new Event("afterprint"));
      });
      expect(document.documentElement).toHaveClass("dark");
    });

    it("does not turn dark mode on after printing when it was off", async () => {
      renderWithDashboardData(<Chart />, { dataPoints: fourWeeks });

      await act(async () => {
        window.dispatchEvent(new Event("beforeprint"));
        window.dispatchEvent(new Event("afterprint"));
      });

      expect(document.documentElement).not.toHaveClass("dark");
    });

    it("stops listening for print events once unmounted", async () => {
      const { unmount } = renderWithDashboardData(<Chart />, { dataPoints: fourWeeks });
      unmount();
      document.documentElement.classList.add("dark");

      await act(async () => {
        window.dispatchEvent(new Event("beforeprint"));
      });

      expect(document.documentElement).toHaveClass("dark");
    });
  });
});
