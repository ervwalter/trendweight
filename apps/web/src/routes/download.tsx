import { SyncProgressProvider } from "@/components/dashboard/sync-progress";
import { SyncProgressOverlay } from "@/components/dashboard/sync-progress/sync-progress-overlay";
import { createFileRoute } from "@tanstack/react-router";
import { Download } from "../components/download/download";
import { Layout } from "../components/layout";
import { requireAuth } from "../lib/auth/auth-guard";
import { ensureProfile, ensureProviderLinks } from "../lib/loaders/utils";

export const Route = createFileRoute("/download")({
  beforeLoad: requireAuth,
  loader: async () => {
    // Ensure user has profile and provider links
    await ensureProfile();
    await ensureProviderLinks();
    return null;
  },
  component: ScaleReadingsPage,
});

function ScaleReadingsPage() {
  return (
    <SyncProgressProvider>
      <Layout title="Download Your Data" suspenseFallback={<SyncProgressOverlay className="w-full" />}>
        <Download />
      </Layout>
    </SyncProgressProvider>
  );
}
