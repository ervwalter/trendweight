import { createFileRoute } from "@tanstack/react-router";
import { SharedDashboardPage } from "@/components/dashboard/shared-dashboard-page";
import { ensureProfile, ensureProviderLinks } from "@/lib/loaders/utils";
import { parseSharingSearch } from "@/lib/routes/sharing-search";

export const Route = createFileRoute("/u/$sharingCode")({
  validateSearch: parseSharingSearch,
  loader: async ({ params, context }) => {
    const { sharingCode } = params;

    // Skip validation for demo
    if (sharingCode === "demo") {
      return null;
    }

    // Only validate profile and provider links in the loader
    // For sharing codes, we use null token getter since these don't require auth
    const nullTokenGetter = async () => null;
    await ensureProfile(context.queryClient, nullTokenGetter, sharingCode);
    await ensureProviderLinks(context.queryClient, nullTokenGetter, sharingCode);

    return null;
  },
  component: SharedDashboardPage,
});
