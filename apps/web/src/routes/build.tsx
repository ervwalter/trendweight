import { createFileRoute } from "@tanstack/react-router";
import { Container } from "../components/Container";
import { Layout } from "../components/Layout";
import { pageTitle } from "../lib/utils/pageTitle";
import { Heading } from "../components/ui/Heading";
import { useState } from "react";
import { ChangelogSection } from "../components/build/ChangelogSection";
import { BuildDetailsSection } from "../components/build/BuildDetailsSection";
import { BrowserInfoSection } from "../components/build/BrowserInfoSection";
import { QuickActionsSection } from "../components/build/QuickActionsSection";
import { formatBuildTime } from "../lib/build/formatters";
import { getBrowserInfo } from "../lib/build/browser-info";
import { getDebugInfo, getMailtoLink } from "../lib/build/debug-info";
import { useChangelog } from "../lib/build/use-changelog";

export const Route = createFileRoute("/build")({
  component: BuildDetails,
});

function BuildDetails() {
  const [copied, setCopied] = useState(false);

  const environment = import.meta.env.MODE || "development";
  const buildTime = import.meta.env.VITE_BUILD_TIME || "Not available";
  const buildCommit = import.meta.env.VITE_BUILD_COMMIT || "Not available";
  const buildBranch = import.meta.env.VITE_BUILD_BRANCH || "Not available";
  const buildVersion = import.meta.env.VITE_BUILD_VERSION || "Not available";
  const buildRepo = import.meta.env.VITE_BUILD_REPO || "";

  const githubRepo = buildRepo ? `https://github.com/${buildRepo}` : null;
  const isTag = buildVersion.startsWith("v") || (!buildVersion.startsWith("build-") && buildVersion !== "Not available" && buildVersion !== "local");
  const commitUrl = githubRepo && buildCommit !== "Not available" ? `${githubRepo}/commit/${buildCommit}` : null;
  const versionUrl = githubRepo && buildVersion !== "Not available" && buildVersion !== "local" && isTag ? `${githubRepo}/releases/tag/${buildVersion}` : null;

  const formattedTime = formatBuildTime(buildTime);
  const buildTimeInfo = typeof formattedTime === "object" ? formattedTime : null;
  const systemInfo = getBrowserInfo();
  const { changelog, loadingChangelog } = useChangelog(buildVersion, buildRepo, isTag, githubRepo);

  const buildInfo = {
    environment,
    buildVersion,
    buildBranch,
    buildCommit,
    buildTime,
    buildTimeInfo,
  };

  const debugInfo = getDebugInfo(buildInfo, systemInfo);
  const mailtoLink = getMailtoLink(debugInfo);

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
    <>
      <title>{pageTitle("Build Information")}</title>

      <Layout>
        <Container>
          <div className="mx-auto max-w-4xl">
            <Heading level={1} className="mb-2" display>
              Build Information
            </Heading>

            <p className="mb-8 text-gray-600">
              This page contains technical information about the current build of TrendWeight. This information is useful when reporting issues or contacting
              support.
            </p>

            <ChangelogSection changelog={changelog} loadingChangelog={loadingChangelog} buildVersion={buildVersion} />

            <QuickActionsSection onCopyClick={copyToClipboard} copied={copied} mailtoLink={mailtoLink} />

            <BuildDetailsSection
              environment={environment}
              buildTime={buildTime}
              buildTimeInfo={buildTimeInfo}
              buildVersion={buildVersion}
              versionUrl={versionUrl}
              buildBranch={buildBranch}
              buildCommit={buildCommit}
              commitUrl={commitUrl}
              buildRepo={buildRepo}
              githubRepo={githubRepo}
            />

            <BrowserInfoSection systemInfo={systemInfo} />
          </div>
        </Container>
      </Layout>
    </>
  );
}
