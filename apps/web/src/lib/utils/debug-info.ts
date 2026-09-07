import { getBrowserInfo } from "@/lib/build/browser-info";
import type { BuildTimeInfo } from "@/lib/build/formatters";
import { formatBuildTime } from "@/lib/build/formatters";

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

  // Empty strings are blank-line separators; `undefined` marks a conditional line to omit
  const sections: (string | undefined)[] = [];

  // Add error-specific information if provided
  if (options?.error || options?.componentStack) {
    sections.push(
      "=== Error Details ===",
      "",
      `- Occurred at: ${new Date().toISOString()}`,
      options.error?.name ? `- Error Type: ${options.error.name}` : undefined,
      options.error?.message ? `- Error Message: ${options.error.message}` : undefined,
      "",
      "Error Stack:",
      options.error?.stack ? options.error.stack.split("\n").slice(0, 10).join("\n") : "No stack trace available",
      "",
      options.componentStack ? "Component Stack:" : undefined,
      options.componentStack ? options.componentStack.trim() : undefined,
      options.componentStack ? "" : undefined,
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
    buildInfo.buildTimeInfo ? `- Build Age: ${buildInfo.buildTimeInfo.ageText}` : undefined,
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

  return sections.filter((line) => line !== undefined).join("\n");
}
