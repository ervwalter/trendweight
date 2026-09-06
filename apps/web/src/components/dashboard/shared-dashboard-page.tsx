import { useParams, useSearch } from "@tanstack/react-router";
import Dashboard from "@/components/dashboard/dashboard";
import DashboardPlaceholder from "@/components/dashboard/dashboard-placeholder";
import { SyncProgressProvider } from "@/components/dashboard/sync-progress";
import { EmbedLayout } from "@/components/embed-layout";
import { Layout } from "@/components/layout";

/** Page body for /u/$sharingCode: a full page normally, a bare embed when ?embed=true */
export function SharedDashboardPage() {
  const { sharingCode } = useParams({ from: "/u/$sharingCode" });
  const search = useSearch({ from: "/u/$sharingCode" });
  const isDemo = sharingCode === "demo";
  const isEmbed = search.embed === true;

  const LayoutComponent = isEmbed ? EmbedLayout : Layout;

  return (
    <SyncProgressProvider disableUI={isEmbed}>
      <LayoutComponent suspenseFallback={isEmbed ? undefined : <DashboardPlaceholder />} noIndex={!isDemo}>
        <Dashboard />
      </LayoutComponent>
    </SyncProgressProvider>
  );
}
