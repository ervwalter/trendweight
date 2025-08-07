import { useState } from "react";
import type { UseFormWatch } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { Heading } from "../ui/Heading";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface AccountManagementSectionProps {
  watch: UseFormWatch<ProfileData>;
}

export function AccountManagementSection({ watch }: AccountManagementSectionProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewUrlConfirm, setShowNewUrlConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const sharingToken = watch("sharingToken");
  const shareUrl = sharingToken ? `${window.location.origin}/u/${sharingToken}` : null;

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

  const handleGenerateNewUrl = () => {
    // TODO: Implement generate new sharing token
    console.log("Generate new URL functionality not implemented yet");
    setShowNewUrlConfirm(false);
  };

  const handleDeleteAccount = () => {
    // TODO: Implement account deletion
    console.log("Account deletion functionality not implemented yet");
    setShowDeleteConfirm(false);
  };

  return (
    <>
      {/* Sharing Section */}
      <div className="border-border border-b p-6">
        <Heading level={2}>Sharing</Heading>
        <p className="text-muted-foreground mb-4 text-sm">
          You can give the following personal URL to anyone you'd like to share your charts and stats with. You can also decide at any time to change the URL
          (in case you change your mind).
        </p>

        {shareUrl && (
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Input type="text" value={shareUrl} readOnly className="bg-muted pr-10" onClick={(e) => e.currentTarget.select()} />
              <Button
                type="button"
                onClick={handleCopy}
                variant="ghost"
                size="sm"
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1"
                title={copied ? "Copied!" : "Copy to clipboard"}
              >
                {copied ? (
                  <svg className="text-success h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <Button type="button" onClick={() => setShowNewUrlConfirm(true)} variant="outline" size="sm">
              Get a New URL
            </Button>
          </div>
        )}
      </div>

      {/* Danger Zone Section */}
      <div className="border-destructive/20 m-6 rounded-lg border-2 p-6">
        <Heading level={2}>Danger Zone</Heading>
        <p className="text-muted-foreground mb-4 text-sm">
          If you wish to delete your account, you may do so at any time. Your account, your settings, and all your weight data will be deleted from TrendWeight
          servers. If you wish to recreate your account at a later date, you may, but you'll need to reconnect your new account to a scale to redownload any
          weight data from Fitbit or Withings at that time.
        </p>

        <Button type="button" onClick={() => setShowDeleteConfirm(true)} variant="destructive" size="sm">
          Delete Account
        </Button>
      </div>

      {/* Confirmation Dialogs */}
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

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Your Account?"
        description={
          <div className="space-y-2">
            <p>This action will permanently delete:</p>
            <ul className="ml-2 list-inside list-disc space-y-1 text-sm">
              <li>Your account and all settings</li>
              <li>All your weight measurement data</li>
              <li>Your connections to Withings and Fitbit</li>
            </ul>
            <p className="font-semibold">This action cannot be undone.</p>
            <p>If you recreate your account later, you'll need to reconnect your scale to re-download any weight data.</p>
          </div>
        }
        confirmText="Yes, Delete My Account"
        destructive
        onConfirm={handleDeleteAccount}
      />
    </>
  );
}
