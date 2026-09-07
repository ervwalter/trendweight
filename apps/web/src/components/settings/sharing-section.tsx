import { useState, Suspense } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/common/copy-button";
import { useSharingSettings } from "@/lib/api/queries";
import { useToggleSharing, useGenerateShareToken } from "@/lib/api/mutations";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/hooks/use-toast";

function SharingSectionContent() {
  const [showNewUrlConfirm, setShowNewUrlConfirm] = useState(false);
  const { data: sharingData } = useSharingSettings();
  const toggleSharing = useToggleSharing();
  const generateToken = useGenerateShareToken();
  const { showToast } = useToast();

  const shareUrl = sharingData?.sharingToken ? `${window.location.origin}/u/${sharingData.sharingToken}` : null;

  const handleToggleSharing = (enabled: boolean) => {
    toggleSharing.mutate(enabled);
  };

  const handleGenerateNewUrl = async () => {
    try {
      await generateToken.mutateAsync();
    } catch {
      showToast({ title: "Something went wrong", description: "A new sharing URL could not be generated. Please try again.", variant: "error" });
    } finally {
      setShowNewUrlConfirm(false);
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle>Sharing</CardTitle>
        <CardDescription>
          You can give the following personal URL to anyone you'd like to share your charts and stats with. You can also decide at any time to change the URL
          (in case you change your mind).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex items-center space-x-3">
          <Switch id="sharingEnabled" checked={sharingData?.sharingEnabled ?? false} onCheckedChange={handleToggleSharing} disabled={toggleSharing.isPending} />
          <label htmlFor="sharingEnabled" className="text-sm font-medium">
            Enable sharing
          </label>
          {toggleSharing.isPending && (
            <svg className="text-muted-foreground h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
              <Input
                type="text"
                value={shareUrl}
                readOnly
                className={`pr-10 ${sharingData?.sharingEnabled ? "bg-muted" : "bg-muted text-muted-foreground"}`}
                onClick={(e) => sharingData?.sharingEnabled && e.currentTarget.select()}
                disabled={!sharingData?.sharingEnabled}
              />
              <CopyButton value={shareUrl} disabled={!sharingData?.sharingEnabled} />
            </div>
            <Button type="button" onClick={() => setShowNewUrlConfirm(true)} variant="outline" size="sm" disabled={generateToken.isPending}>
              {generateToken.isPending ? "Generating..." : "Get a New URL"}
            </Button>
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={showNewUrlConfirm}
        onOpenChange={setShowNewUrlConfirm}
        title="Generate New Sharing URL?"
        description={
          <div className="space-y-2">
            <p>This will permanently invalidate your current sharing URL:</p>
            <p className="bg-muted rounded p-2 font-mono text-sm">{shareUrl}</p>
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
        <>
          <CardHeader>
            <CardTitle>Sharing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Loading sharing settings...</p>
          </CardContent>
        </>
      }
    >
      <SharingSectionContent />
    </Suspense>
  );
}
