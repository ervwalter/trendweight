import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface SystemInfo {
  browser: string;
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  viewportSize: string;
  cookiesEnabled: boolean;
  localStorage: boolean;
}

interface BrowserInfoSectionProps {
  systemInfo: SystemInfo;
}

export function BrowserInfoSection({ systemInfo }: BrowserInfoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Browser Information</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200">
          <div className="flex justify-between px-6 py-4">
            <span className="text-muted-foreground">Browser</span>
            <span className="font-medium">{systemInfo.browser}</span>
          </div>
          <div className="flex justify-between px-6 py-4">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-medium">{systemInfo.platform}</span>
          </div>
          <div className="flex justify-between px-6 py-4">
            <span className="text-muted-foreground">Screen Resolution</span>
            <span className="font-medium">{systemInfo.screenResolution}</span>
          </div>
          <div className="flex justify-between px-6 py-4">
            <span className="text-muted-foreground">Viewport Size</span>
            <span className="font-medium">{systemInfo.viewportSize}</span>
          </div>
          <div className="px-6 py-4">
            <div className="text-muted-foreground mb-1">User Agent</div>
            <div className="bg-muted overflow-x-auto rounded p-2 font-mono text-xs">{systemInfo.userAgent}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
