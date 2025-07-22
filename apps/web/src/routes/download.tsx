import { createFileRoute } from "@tanstack/react-router";
import { Download } from "../components/download/Download";
import { Layout } from "../components/Layout";
import { requireAuth } from "../lib/auth/authGuard";
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
    <Layout title="Download Your Data" suspenseFallback={<div className="py-8 text-center">Loading scale readings...</div>}>
      <Download />
    </Layout>
  );
}
