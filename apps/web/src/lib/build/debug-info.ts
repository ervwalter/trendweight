import type { BuildTimeInfo } from "./formatters";
import type { SystemInfo } from "./browser-info";

interface BuildInfo {
  environment: string;
  buildVersion: string;
  buildBranch: string;
  buildCommit: string;
  buildTime: string;
  buildTimeInfo: BuildTimeInfo | null;
}

export function getDebugInfo(buildInfo: BuildInfo, systemInfo: SystemInfo): string {
  const info = [
    "=== TrendWeight Build Information ===",
    "",
    "Build Details:",
    `- Environment: ${buildInfo.environment}`,
    `- Version: ${buildInfo.buildVersion}`,
    `- Branch: ${buildInfo.buildBranch}`,
    `- Commit: ${buildInfo.buildCommit}`,
    `- Build Time: ${buildInfo.buildTime}`,
    buildInfo.buildTimeInfo && typeof buildInfo.buildTimeInfo === "object" ? `- Build Age: ${buildInfo.buildTimeInfo.ageText}` : "",
    "",
    "System Information:",
    `- Browser: ${systemInfo.browser}`,
    `- Platform: ${systemInfo.platform}`,
    `- Language: ${systemInfo.language}`,
    `- Screen Resolution: ${systemInfo.screenResolution}`,
    `- Viewport Size: ${systemInfo.viewportSize}`,
    `- Cookies Enabled: ${systemInfo.cookiesEnabled}`,
    `- Local Storage: ${systemInfo.localStorage}`,
    "",
    "User Agent:",
    systemInfo.userAgent,
    "",
    `Generated at: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  return info;
}

export function getMailtoLink(debugInfo: string): string {
  const subject = encodeURIComponent("TrendWeight Support Request");
  const body = encodeURIComponent("Please describe your issue here:\n\n\n\n" + "--- System Information (Please keep this) ---\n" + debugInfo);
  return `mailto:erv@ewal.net?subject=${subject}&body=${body}`;
}
