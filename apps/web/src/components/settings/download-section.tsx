import { Link } from "@tanstack/react-router";
import { useProviderLinks } from "@/lib/api/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
        <CardDescription>
          You can view and download all your historical scale readings from your connected providers. Export your data as a CSV file for backup or analysis in
          other applications.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="default" size="sm">
          <Link to="/download">View / Download Your Data</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
