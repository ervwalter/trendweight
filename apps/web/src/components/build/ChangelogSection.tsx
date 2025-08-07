import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ChangelogSectionProps {
  changelog: string | null;
  loadingChangelog: boolean;
  buildVersion: string;
}

export function ChangelogSection({ changelog, loadingChangelog, buildVersion }: ChangelogSectionProps) {
  if (!changelog && !loadingChangelog) {
    return null;
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Changelog for {buildVersion}</CardTitle>
      </CardHeader>
      <CardContent>
        {loadingChangelog ? (
          <p className="text-gray-500">Loading changelog...</p>
        ) : (
          <div className="prose prose-sm prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0 max-w-none">
            <ReactMarkdown>{changelog || ""}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
