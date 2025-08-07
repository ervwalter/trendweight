import { ExternalLink } from "../ui/ExternalLink";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface BuildDetailsSectionProps {
  environment: string;
  buildTime: string;
  buildTimeInfo: {
    localTime: string;
    utcTime: string;
    ageText: string;
  } | null;
  buildVersion: string;
  versionUrl: string | null;
  buildBranch: string;
  buildCommit: string;
  commitUrl: string | null;
  buildRepo: string;
  githubRepo: string | null;
}

export function BuildDetailsSection({
  environment,
  buildTime,
  buildTimeInfo,
  buildVersion,
  versionUrl,
  buildBranch,
  buildCommit,
  commitUrl,
  buildRepo,
  githubRepo,
}: BuildDetailsSectionProps) {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Build Details</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200">
          <div className="flex justify-between px-6 py-4">
            <span className="text-muted-foreground">Environment</span>
            <span className="font-medium">
              {environment === "production" ? (
                <span className="text-success">Production</span>
              ) : environment === "development" ? (
                <span className="text-warning">Development</span>
              ) : (
                <span className="text-info">{environment}</span>
              )}
            </span>
          </div>

          <div className="px-6 py-4">
            <div className="mb-1 flex justify-between">
              <span className="text-muted-foreground">Build Time</span>
              {buildTimeInfo && typeof buildTimeInfo === "object" ? (
                <span className="text-right font-medium">
                  <div>{buildTimeInfo.ageText}</div>
                  <div className="text-muted-foreground text-sm">{buildTimeInfo.localTime}</div>
                </span>
              ) : (
                <span className="font-medium">{buildTime}</span>
              )}
            </div>
          </div>

          <div className="flex justify-between px-6 py-4">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium">{versionUrl ? <ExternalLink href={versionUrl}>{buildVersion}</ExternalLink> : buildVersion}</span>
          </div>

          <div className="flex justify-between px-6 py-4">
            <span className="text-muted-foreground">Branch</span>
            <span className="font-mono text-sm font-medium">{buildBranch}</span>
          </div>

          <div className="flex justify-between px-6 py-4">
            <span className="text-muted-foreground">Commit</span>
            <span className="font-mono text-sm font-medium">
              {commitUrl ? <ExternalLink href={commitUrl}>{buildCommit.substring(0, 7)}</ExternalLink> : buildCommit}
            </span>
          </div>

          {buildRepo && githubRepo && (
            <div className="flex justify-between px-6 py-4">
              <span className="text-muted-foreground">Repository</span>
              <span className="font-medium">
                <ExternalLink href={githubRepo}>{buildRepo}</ExternalLink>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
