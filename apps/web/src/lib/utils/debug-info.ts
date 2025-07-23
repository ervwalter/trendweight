import { getBrowserInfo } from "../build/browser-info";
import type { BuildTimeInfo } from "../build/formatters";
import { formatBuildTime } from "../build/formatters";

export interface BuildInfo {
  environment: string;
  buildVersion: string;
  buildBranch: string;
  buildCommit: string;
  buildTime: string;
  buildTimeInfo: BuildTimeInfo | null;
}

export function getBuildInfo(): BuildInfo {
  const environment = import.meta.env.MODE || "development";
  const buildTime = import.meta.env.VITE_BUILD_TIME || "Not available";
  const buildCommit = import.meta.env.VITE_BUILD_COMMIT || "Not available";
  const buildBranch = import.meta.env.VITE_BUILD_BRANCH || "Not available";
  const buildVersion = import.meta.env.VITE_BUILD_VERSION || "Not available";

  const formattedTime = formatBuildTime(buildTime);
  const buildTimeInfo = typeof formattedTime === "object" ? formattedTime : null;

  return {
    environment,
    buildVersion,
    buildBranch,
    buildCommit,
    buildTime,
    buildTimeInfo,
  };
}

interface DebugInfoOptions {
  error?: Error;
  componentStack?: string;
}

export function getDebugInfo(options?: DebugInfoOptions): string {
  const buildInfo = getBuildInfo();
  const systemInfo = getBrowserInfo();

  const sections: string[] = [];

  // Add error-specific information if provided
  if (options?.error || options?.componentStack) {
    sections.push(
      "=== Error Details ===",
      "",
      `- Occurred at: ${new Date().toISOString()}`,
      options.error?.name ? `- Error Type: ${options.error.name}` : "",
      options.error?.message ? `- Error Message: ${options.error.message}` : "",
      "",
      "Error Stack:",
      options.error?.stack ? options.error.stack.split("\n").slice(0, 10).join("\n") : "No stack trace available",
      "",
      options.componentStack ? "Component Stack:" : "",
      options.componentStack || "",
      options.componentStack ? "" : "",
      "Page Information:",
      `- Current URL: ${window.location.href}`,
      `- Referrer: ${document.referrer || "Direct navigation"}`,
      "",
    );
  }

  // Add build information
  sections.push(
    "=== Build Information ===",
    "",
    `- Environment: ${buildInfo.environment}`,
    `- Version: ${buildInfo.buildVersion}`,
    `- Branch: ${buildInfo.buildBranch}`,
    `- Commit: ${buildInfo.buildCommit}`,
    `- Build Time: ${buildInfo.buildTime}`,
    buildInfo.buildTimeInfo && typeof buildInfo.buildTimeInfo === "object" ? `- Build Age: ${buildInfo.buildTimeInfo.ageText}` : "",
    "",
    "=== System Information ===",
    "",
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
  );

  return sections.filter(Boolean).join("\n");
}
