import ReactMarkdown from "react-markdown";

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
    <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
        <h2 className="font-semibold">Changelog for {buildVersion}</h2>
      </div>
      <div className="px-6 py-4">
        {loadingChangelog ? (
          <p className="text-gray-500">Loading changelog...</p>
        ) : (
          <div className="prose prose-sm prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0 max-w-none">
            <ReactMarkdown>{changelog || ""}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
