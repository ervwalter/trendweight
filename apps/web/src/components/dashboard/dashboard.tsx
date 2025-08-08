import { Navigate } from "@tanstack/react-router";
import type { FC } from "react";
import { ApiError } from "../../lib/api/client";
import { Modes, TimeRanges } from "../../lib/core/interfaces";
import { DashboardProvider } from "../../lib/dashboard/context";
import { useComputeDashboardData } from "../../lib/dashboard/hooks";
import { Heading } from "../common/heading";
import Buttons from "./buttons";
import Chart from "./chart/chart";
import Currently from "./currently";
import Deltas from "./deltas";
import HelpLink from "./help-link";
import { NoDataCard } from "./no-data-card";
import ProviderSyncErrors from "./provider-sync-errors";
import RecentReadings from "./recent-readings";
import Stats from "./stats";
import { NewVersionNotice } from "../notices/new-version-notice";

interface DashboardProps {
  sharingCode?: string;
}

const Dashboard: FC<DashboardProps> = ({ sharingCode }) => {
  const dashboardData = useComputeDashboardData(sharingCode);

  // Check if profile exists - if not, redirect to initial setup (skip for shared views)
  if (!sharingCode && dashboardData.profileError instanceof ApiError && dashboardData.profileError.status === 404) {
    return <Navigate to="/initial-setup" replace />;
  }

  // If shared view and profile not found, redirect to home
  if (sharingCode && sharingCode !== "demo" && dashboardData.profileError instanceof ApiError && dashboardData.profileError.status === 404) {
    return <Navigate to="/" replace />;
  }

  // If profile exists but no measurements
  if (dashboardData.measurements.length === 0) {
    // For shared views, redirect to home
    if (!dashboardData.isMe) {
      return <Navigate to="/" replace />;
    }

    // For authenticated users with providers connected but no data
    return (
      <div className="py-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <ProviderSyncErrors providerStatus={dashboardData.providerStatus} />
          <NoDataCard providerStatus={dashboardData.providerStatus} />
        </div>
      </div>
    );
  }

  return (
    <DashboardProvider data={dashboardData}>
      <div className="flex flex-col gap-4">
        <ProviderSyncErrors providerStatus={dashboardData.providerStatus} />
        {dashboardData.isMe && dashboardData.profile.isMigrated && <NewVersionNotice />}
        <Buttons />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-12">
          <div className="w-full md:w-[475px] lg:w-[650px] xl:w-[840px]">
            <Heading level={2} className="mb-4">
              {Modes[dashboardData.mode[0]]},{" "}
              {dashboardData.timeRange[0] === "all"
                ? "All Time"
                : dashboardData.timeRange[0] === "explore"
                  ? "Explore"
                  : `Past ${TimeRanges[dashboardData.timeRange[0]]}`}
              {!dashboardData.isMe && ` for ${dashboardData.profile.firstName}`}
            </Heading>
            <Chart />
          </div>
          <Currently />
        </div>
        <div className="flex flex-col-reverse gap-4 md:flex-row md:gap-12 lg:gap-20">
          <RecentReadings />
          <div className="flex flex-col gap-4">
            <Deltas />
            <Stats />
            <HelpLink />
          </div>
        </div>
      </div>
    </DashboardProvider>
  );
};

export default Dashboard;
