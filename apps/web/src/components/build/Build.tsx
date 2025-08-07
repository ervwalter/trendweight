import { Container } from "../Container";
import { Heading } from "../common/heading";
import { useState } from "react";
import { ChangelogSection } from "./ChangelogSection";
import { BuildDetailsSection } from "./BuildDetailsSection";
import { BrowserInfoSection } from "./BrowserInfoSection";
import { QuickActionsSection } from "./QuickActionsSection";
import { getBrowserInfo } from "../../lib/build/browser-info";
import { getDebugInfo, getBuildInfo } from "../../lib/utils/debug-info";
import { useChangelog } from "../../lib/build/use-changelog";

export function Build() {
  const [copied, setCopied] = useState(false);

  const buildInfo = getBuildInfo();
  const buildRepo = import.meta.env.VITE_BUILD_REPO || "";

  const githubRepo = buildRepo ? `https://github.com/${buildRepo}` : null;
  const isTag =
    buildInfo.buildVersion.startsWith("v") ||
    (!buildInfo.buildVersion.startsWith("build-") && buildInfo.buildVersion !== "Not available" && buildInfo.buildVersion !== "local");
  const commitUrl = githubRepo && buildInfo.buildCommit !== "Not available" ? `${githubRepo}/commit/${buildInfo.buildCommit}` : null;
  const versionUrl =
    githubRepo && buildInfo.buildVersion !== "Not available" && buildInfo.buildVersion !== "local" && isTag
      ? `${githubRepo}/releases/tag/${buildInfo.buildVersion}`
      : null;

  const systemInfo = getBrowserInfo();
  const { changelog, loadingChangelog } = useChangelog(buildInfo.buildVersion, buildRepo, isTag, githubRepo);

  const debugInfo = getDebugInfo(); // No error, just system info

  // Build the mailto link with custom subject and preamble
  const subject = encodeURIComponent("TrendWeight Support Request");
  const body = encodeURIComponent("Please describe your issue here:\n\n\n\n" + "--- System Information (Please keep this) ---\n" + debugInfo);
  const mailtoLink = `mailto:erv@ewal.net?subject=${subject}&body=${body}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(debugInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Container>
      <div className="mx-auto max-w-4xl">
        <Heading level={1} className="mb-2" display>
          Build Information
        </Heading>

        <p className="text-muted-foreground mb-8">
          This page contains technical information about the current build of TrendWeight. This information is useful when reporting issues or contacting
          support.
        </p>

        <ChangelogSection changelog={changelog} loadingChangelog={loadingChangelog} buildVersion={buildInfo.buildVersion} />

        <QuickActionsSection onCopyClick={copyToClipboard} copied={copied} mailtoLink={mailtoLink} />

        <BuildDetailsSection
          environment={buildInfo.environment}
          buildTime={buildInfo.buildTime}
          buildTimeInfo={buildInfo.buildTimeInfo}
          buildVersion={buildInfo.buildVersion}
          versionUrl={versionUrl}
          buildBranch={buildInfo.buildBranch}
          buildCommit={buildInfo.buildCommit}
          commitUrl={commitUrl}
          buildRepo={buildRepo}
          githubRepo={githubRepo}
        />

        <BrowserInfoSection systemInfo={systemInfo} />
      </div>
    </Container>
  );
}
