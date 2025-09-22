import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProviderLinks } from "@/lib/api/queries";
import { Link } from "@tanstack/react-router";

export function DownloadSection() {
  const { data: providerLinks } = useProviderLinks();
  const hasConnectedProviders = providerLinks?.some((link) => link.hasToken && !link.isDisabled) || false;

  // Only show this section if there's at least one connected provider
  if (!hasConnectedProviders) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Download</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between space-x-4">
        <p className="text-muted-foreground flex-1 pr-4 text-sm">
          You can view and download all your historical scale readings from your connected providers. Export your data as a CSV file for backup or analysis in
          other applications.
        </p>
        <Button asChild variant="default" size="sm">
          <Link to="/download">View / Download Your Data</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
