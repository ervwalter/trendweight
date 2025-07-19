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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <h2 className="font-semibold">Browser Information</h2>
      </div>
      <div className="divide-y divide-gray-200">
        <div className="flex justify-between px-6 py-4">
          <span className="text-gray-600">Browser</span>
          <span className="font-medium">{systemInfo.browser}</span>
        </div>
        <div className="flex justify-between px-6 py-4">
          <span className="text-gray-600">Platform</span>
          <span className="font-medium">{systemInfo.platform}</span>
        </div>
        <div className="flex justify-between px-6 py-4">
          <span className="text-gray-600">Screen Resolution</span>
          <span className="font-medium">{systemInfo.screenResolution}</span>
        </div>
        <div className="flex justify-between px-6 py-4">
          <span className="text-gray-600">Viewport Size</span>
          <span className="font-medium">{systemInfo.viewportSize}</span>
        </div>
        <div className="px-6 py-4">
          <div className="mb-1 text-gray-600">User Agent</div>
          <div className="overflow-x-auto rounded bg-gray-50 p-2 font-mono text-xs">{systemInfo.userAgent}</div>
        </div>
      </div>
    </div>
  );
}
