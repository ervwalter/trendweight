import type { FC } from "react";
import { Modes, TimeRanges } from "../../lib/core/interfaces";
import { formatMeasurement } from "../../lib/core/numbers";
import { DashboardProvider } from "../../lib/dashboard/context";
import type { DashboardData } from "../../lib/dashboard/dashboard-context";
import Chart from "./chart/chart";

interface EmbedDashboardProps {
  dashboardData: DashboardData;
}

export const EmbedDashboard: FC<EmbedDashboardProps> = ({ dashboardData }) => {
  // Handle no data case for embed mode
  if (dashboardData.dataPoints.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">No data available</div>
      </div>
    );
  }

  const lastDataPoint = dashboardData.dataPoints[dashboardData.dataPoints.length - 1];
  const currentValue = lastDataPoint
    ? formatMeasurement(lastDataPoint.trend, {
        type: dashboardData.mode[0],
        metric: dashboardData.profile.useMetric,
      })
    : null;

  return (
    <DashboardProvider data={dashboardData}>
      <div className="flex h-full w-full flex-col">
        <div className="flex items-baseline justify-between text-lg">
          <div className="font-medium">
            {Modes[dashboardData.mode[0]]},{" "}
            {dashboardData.timeRange[0] === "all"
              ? "All Time"
              : dashboardData.timeRange[0] === "explore"
                ? "Explore"
                : `Past ${TimeRanges[dashboardData.timeRange[0]]}`}
            {!dashboardData.isMe && ` for ${dashboardData.profile.firstName}`}
          </div>
          {currentValue && (
            <div className="text-muted-foreground">
              Current: <span className="text-foreground font-medium">{currentValue}</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <Chart />
        </div>
      </div>
    </DashboardProvider>
  );
};
