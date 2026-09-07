import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocalDate } from "@js-joda/core";
import Dashboard from "./dashboard";
import { ApiError } from "@/lib/api/client";
import { useComputeDashboardData } from "@/lib/dashboard/hooks";
import { useSharingCode } from "@/lib/hooks/use-sharing-code";
import { useEmbedParams } from "@/lib/hooks/use-embed-params";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";

vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate">{to}</div>,
}));
vi.mock("@/lib/dashboard/hooks");
vi.mock("@/lib/hooks/use-sharing-code");
vi.mock("@/lib/hooks/use-embed-params");
vi.mock("@/lib/dashboard/context", () => ({
  DashboardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./embed-dashboard", () => ({ EmbedDashboard: () => <div data-testid="embed-dashboard" /> }));
vi.mock("./buttons", () => ({ default: () => <div data-testid="buttons" /> }));
vi.mock("./chart/chart", () => ({ default: () => <div data-testid="chart" /> }));
vi.mock("./currently", () => ({ default: () => <div data-testid="currently" /> }));
vi.mock("./deltas", () => ({ default: () => <div data-testid="deltas" /> }));
vi.mock("./stats", () => ({ default: () => <div data-testid="stats" /> }));
vi.mock("./recent-readings", () => ({ default: () => <div data-testid="recent-readings" /> }));
vi.mock("./help-link", () => ({ default: () => <div data-testid="help-link" /> }));
vi.mock("./no-data-card", () => ({ NoDataCard: () => <div data-testid="no-data-card" /> }));
vi.mock("./provider-sync-errors", () => ({ default: () => <div data-testid="provider-sync-errors" /> }));
vi.mock("@/components/log/quick-log-button", () => ({ QuickLogButton: () => <button>Log Weight</button> }));
vi.mock("@/components/notices/fitbit-sunset-notice", () => ({ FitbitSunsetNotice: () => <div data-testid="fitbit-sunset-notice" /> }));

const measurement = {
  date: LocalDate.of(2026, 9, 1),
  source: "manual",
  actualWeight: 80,
  trendWeight: 80,
  weightIsInterpolated: false,
  fatIsInterpolated: false,
};
const dataPoint = { date: LocalDate.of(2026, 9, 1), source: "manual", actual: 80, trend: 80, isInterpolated: false };

function mockData(overrides: Partial<DashboardData> = {}) {
  vi.mocked(useComputeDashboardData).mockReturnValue({
    dataPoints: [dataPoint],
    measurements: [measurement],
    mode: ["weight", vi.fn()],
    timeRange: ["4w", vi.fn()],
    profile: { firstName: "Jane", useMetric: false } as DashboardData["profile"],
    profileError: null,
    weightSlope: 0,
    activeSlope: 0,
    deltas: [],
    providerStatus: {},
    isMe: true,
    ...overrides,
  });
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSharingCode).mockReturnValue(undefined);
    vi.mocked(useEmbedParams).mockReturnValue({});
    mockData();
  });

  describe("profile not found", () => {
    it("sends the owner to initial setup", () => {
      mockData({ profileError: new ApiError(404, "Profile not found") });

      render(<Dashboard />);

      expect(screen.getByTestId("navigate")).toHaveTextContent("/initial-setup");
    });

    it("sends a shared viewer home", () => {
      vi.mocked(useSharingCode).mockReturnValue("abc123");
      mockData({ profileError: new ApiError(404, "Profile not found"), isMe: false });

      render(<Dashboard />);

      expect(screen.getByTestId("navigate")).toHaveTextContent("/");
    });
  });

  it("renders the embed dashboard when embedded", () => {
    vi.mocked(useSharingCode).mockReturnValue("abc123");
    vi.mocked(useEmbedParams).mockReturnValue({ embed: true });
    mockData({ isMe: false });

    render(<Dashboard />);

    expect(screen.getByTestId("embed-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });

  describe("without measurements", () => {
    it("shows the waiting card, sync errors and the log button to the owner", () => {
      mockData({ measurements: [], dataPoints: [] });

      render(<Dashboard />);

      expect(screen.getByTestId("no-data-card")).toBeInTheDocument();
      expect(screen.getByTestId("provider-sync-errors")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Log Weight" })).toBeInTheDocument();
      expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
    });

    it("sends a shared viewer home", () => {
      vi.mocked(useSharingCode).mockReturnValue("abc123");
      mockData({ measurements: [], dataPoints: [], isMe: false });

      render(<Dashboard />);

      expect(screen.getByTestId("navigate")).toHaveTextContent("/");
      expect(screen.queryByTestId("no-data-card")).not.toBeInTheDocument();
    });
  });

  describe("full dashboard", () => {
    it("renders the chart, stats and controls for the owner", () => {
      render(<Dashboard />);

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Weight, Past 4 weeks");
      expect(screen.getByTestId("buttons")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Log Weight" })).toBeInTheDocument();
      for (const id of ["chart", "currently", "recent-readings", "deltas", "stats", "help-link"]) {
        expect(screen.getByTestId(id)).toBeInTheDocument();
      }
      expect(screen.queryByTestId("fitbit-sunset-notice")).not.toBeInTheDocument();
    });

    it("names the owner and hides the log button on a shared dashboard", () => {
      vi.mocked(useSharingCode).mockReturnValue("abc123");
      mockData({ isMe: false, timeRange: ["all", vi.fn()] });

      render(<Dashboard />);

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Weight, All Time for Jane");
      expect(screen.queryByRole("button", { name: "Log Weight" })).not.toBeInTheDocument();
    });

    it("labels explore mode", () => {
      mockData({ mode: ["fatpercent", vi.fn()], timeRange: ["explore", vi.fn()] });

      render(<Dashboard />);

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Fat %, Explore");
    });

    it("shows the Fitbit sunset notice only while Fitbit still syncs", () => {
      mockData({ providerStatus: { fitbit: { success: true } } });
      const { unmount } = render(<Dashboard />);
      expect(screen.getByTestId("fitbit-sunset-notice")).toBeInTheDocument();
      unmount();

      mockData({ providerStatus: { fitbit: { success: false, error: "disabled" } } });
      render(<Dashboard />);
      expect(screen.queryByTestId("fitbit-sunset-notice")).not.toBeInTheDocument();
    });

    it("does not show the Fitbit sunset notice to shared viewers", () => {
      vi.mocked(useSharingCode).mockReturnValue("abc123");
      mockData({ isMe: false, providerStatus: { fitbit: { success: true } } });

      render(<Dashboard />);

      expect(screen.queryByTestId("fitbit-sunset-notice")).not.toBeInTheDocument();
    });

    it("shows an empty state instead of chart and stats when a body-fat mode has no readings", () => {
      mockData({ mode: ["fatmass", vi.fn()], dataPoints: [] });

      render(<Dashboard />);

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Fat Mass, Past 4 weeks");
      expect(screen.getByRole("status")).toHaveTextContent(/No body fat readings yet/);
      expect(screen.getByTestId("buttons")).toBeInTheDocument();
      for (const id of ["chart", "currently", "recent-readings", "deltas", "stats"]) {
        expect(screen.queryByTestId(id)).not.toBeInTheDocument();
      }
    });
  });
});
