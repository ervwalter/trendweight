import { useState } from "react";
import type { UseFormWatch } from "react-hook-form";
import type { SettingsData } from "../../lib/core/interfaces";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface AccountManagementSectionProps {
  watch: UseFormWatch<SettingsData>;
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
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Sharing</h2>
        <p className="text-sm text-gray-600 mb-4">
          You can give the following personal URL to anyone you'd like to share your charts and stats with. You can also decide at any time to change the URL
          (in case you change your mind).
        </p>

        {shareUrl && (
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md bg-gray-50 text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                title={copied ? "Copied!" : "Copy to clipboard"}
              >
                {copied ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowNewUrlConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Get a New URL
            </button>
          </div>
        )}
      </div>

      {/* Danger Zone Section */}
      <div className="p-6 border-2 border-red-100 rounded-lg m-6">
        <h2 className="text-xl font-semibold mb-4">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          If you wish to delete your account, you may do so at any time. Your account, your settings, and all your weight data will be deleted from TrendWeight
          servers. If you wish to recreate your account at a later date, you may, but you'll need to reconnect your new account to a scale to redownload any
          weight data from Fitbit or Withings at that time.
        </p>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-red-700 rounded-md hover:bg-red-800"
        >
          Delete Account
        </button>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showNewUrlConfirm}
        onOpenChange={setShowNewUrlConfirm}
        title="Generate New Sharing URL?"
        description={
          <div className="space-y-2">
            <p>This will permanently invalidate your current sharing URL:</p>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded">{shareUrl}</p>
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
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
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
