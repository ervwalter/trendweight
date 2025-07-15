import { useState, Suspense } from "react";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Heading } from "../ui/Heading";
import { Button } from "../ui/Button";
import { useSharingSettings } from "../../lib/api/queries";
import { useToggleSharing, useGenerateShareToken } from "../../lib/api/mutations";
import { Switch } from "../ui/Switch";

function SharingSectionContent() {
  const [showNewUrlConfirm, setShowNewUrlConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data: sharingData } = useSharingSettings();
  const toggleSharing = useToggleSharing();
  const generateToken = useGenerateShareToken();

  const shareUrl = sharingData?.sharingToken ? `${window.location.origin}/u/${sharingData.sharingToken}` : null;

  const handleCopy = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const handleToggleSharing = (enabled: boolean) => {
    toggleSharing.mutate(enabled);
  };

  const handleGenerateNewUrl = async () => {
    try {
      await generateToken.mutateAsync();
      setShowNewUrlConfirm(false);
    } catch (error) {
      console.error("Failed to generate new URL:", error);
    }
  };

  return (
    <>
      <div className="p-6">
        <Heading level={2}>Sharing</Heading>
        <p className="mb-4 text-sm text-gray-600">
          You can give the following personal URL to anyone you'd like to share your charts and stats with. You can also decide at any time to change the URL
          (in case you change your mind).
        </p>

        <div className="mb-6 flex items-center space-x-3">
          <Switch checked={sharingData?.sharingEnabled ?? false} onCheckedChange={handleToggleSharing} disabled={toggleSharing.isPending} />
          <label className="text-sm font-medium">Enable sharing</label>
          {toggleSharing.isPending && (
            <svg className="h-4 w-4 animate-spin text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
        </div>

        {shareUrl && (
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={`w-full rounded-md border px-3 py-2 pr-10 text-sm ${
                  sharingData?.sharingEnabled ? "border-gray-300 bg-gray-50" : "border-gray-200 bg-gray-100 text-gray-400"
                }`}
                onClick={(e) => sharingData?.sharingEnabled && e.currentTarget.select()}
                disabled={!sharingData?.sharingEnabled}
              />
              <Button
                type="button"
                onClick={handleCopy}
                variant="ghost"
                size="sm"
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1"
                title={copied ? "Copied!" : "Copy to clipboard"}
                disabled={!sharingData?.sharingEnabled}
              >
                {copied ? (
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </Button>
            </div>
            <Button type="button" onClick={() => setShowNewUrlConfirm(true)} variant="secondary" size="sm" disabled={generateToken.isPending}>
              {generateToken.isPending ? "Generating..." : "Get a New URL"}
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showNewUrlConfirm}
        onOpenChange={setShowNewUrlConfirm}
        title="Generate New Sharing URL?"
        description={
          <div className="space-y-2">
            <p>This will permanently invalidate your current sharing URL:</p>
            <p className="rounded bg-gray-100 p-2 font-mono text-sm">{shareUrl}</p>
            <p>Anyone using the old URL will no longer be able to access your dashboard. This action cannot be undone.</p>
          </div>
        }
        confirmText="Generate New URL"
        destructive
        onConfirm={handleGenerateNewUrl}
      />
    </>
  );
}

export function SharingSection() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Heading level={2}>Sharing</Heading>
          <p className="text-sm text-gray-500">Loading sharing settings...</p>
        </div>
      }
    >
      <SharingSectionContent />
    </Suspense>
  );
}
