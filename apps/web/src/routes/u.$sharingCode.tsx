import { createFileRoute } from "@tanstack/react-router";
import Dashboard from "../components/dashboard/dashboard";
import DashboardPlaceholder from "../components/dashboard/dashboard-placeholder";
import { SyncProgressProvider } from "../components/dashboard/sync-progress";
import { Layout } from "../components/layout";
import { EmbedLayout } from "../components/embed-layout";
import { ensureProfile, ensureProviderLinks } from "../lib/loaders/utils";
import type { Mode, TimeRange } from "../lib/core/interfaces";

export const Route = createFileRoute("/u/$sharingCode")({
  validateSearch: (search: Record<string, unknown>) => {
    const result: {
      range?: TimeRange;
      mode?: Mode;
      embed?: boolean;
      dark?: boolean;
      width?: number;
    } = {};

    // Validate range - if present but invalid, set to default (case-insensitive)
    const validRanges: TimeRange[] = ["4w", "3m", "6m", "1y", "all"];
    if (search.range) {
      const normalizedRange = String(search.range).toLowerCase();
      if (validRanges.includes(normalizedRange as TimeRange)) {
        result.range = normalizedRange as TimeRange;
      } else {
        result.range = "4w"; // Default to 4w for invalid ranges
      }
    }

    // Validate mode - if present but invalid, set to default (case-insensitive)
    const validModes: Mode[] = ["weight", "fatpercent", "fatmass", "leanmass"];
    if (search.mode) {
      const normalizedMode = String(search.mode).toLowerCase();
      if (validModes.includes(normalizedMode as Mode)) {
        result.mode = normalizedMode as Mode;
      } else {
        result.mode = "weight"; // Default to weight for invalid modes
      }
    }

    // Validate embed - only allow 'true' string or boolean true
    if (search.embed === "true" || search.embed === true) {
      result.embed = true;
    }

    // Validate dark - allow 'true'/'false' strings or boolean values
    if (search.dark === "true" || search.dark === true) {
      result.dark = true;
    } else if (search.dark === "false" || search.dark === false) {
      result.dark = false;
    }

    // Validate width - round to positive integer
    if (search.width) {
      const width = Math.round(Number(search.width));
      if (!isNaN(width) && width > 0) {
        result.width = width;
      }
    }

    return result;
  },
  loader: async ({ params }) => {
    const { sharingCode } = params;

    // Skip validation for demo
    if (sharingCode === "demo") {
      return null;
    }

    // Only validate profile and provider links in the loader
    // For sharing codes, we use null token getter since these don't require auth
    const nullTokenGetter = async () => null;
    await ensureProfile(nullTokenGetter, sharingCode);
    await ensureProviderLinks(nullTokenGetter, sharingCode);

    return null;
  },
  component: SharedDashboard,
});

function SharedDashboard() {
  const { sharingCode } = Route.useParams();
  const search = Route.useSearch();
  const isDemo = sharingCode === "demo";
  const isEmbed = search.embed === true;

  const LayoutComponent = isEmbed ? EmbedLayout : Layout;
  const dashboardElement = <Dashboard />;

  return (
    <SyncProgressProvider disableUI={isEmbed}>
      <LayoutComponent suspenseFallback={isEmbed ? undefined : <DashboardPlaceholder />} noIndex={!isDemo}>
        {dashboardElement}
      </LayoutComponent>
    </SyncProgressProvider>
  );
}
