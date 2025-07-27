import { Link } from "@tanstack/react-router";
import { useProviderLinks } from "../../lib/api/queries";
import { Button } from "../ui/Button";
import { Heading } from "../ui/Heading";

export function DownloadSection() {
  const { data: providerLinks } = useProviderLinks();
  const hasConnectedProviders = providerLinks?.some((link) => link.hasToken && !link.isDisabled) || false;

  // Only show this section if there's at least one connected provider
  if (!hasConnectedProviders) {
    return null;
  }

  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-6">
        <Heading level={2}>Download</Heading>
        <p className="mt-2 text-sm text-gray-600">
          You can view and download all your historical scale readings from your connected providers. Export your data as a CSV file for backup or analysis in
          other applications.
        </p>
        <div className="mt-4">
          <Button asChild variant="primary" size="sm">
            <Link to="/download">View / Download Your Data</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
