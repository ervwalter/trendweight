import { useState } from "react";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { Heading } from "../ui/Heading";
import { Button } from "../ui/Button";
import { useDeleteAccount } from "../../lib/api/mutations";
import { useAuth } from "../../lib/auth/useAuth";

export function DangerZoneSection() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { signOut } = useAuth();
  const deleteAccountMutation = useDeleteAccount();

  const handleDeleteAccount = async () => {
    console.log("[DangerZone] Starting account deletion");
    try {
      await deleteAccountMutation.mutateAsync();
      console.log("[DangerZone] Account deleted, signing out with redirect to /account-deleted");

      // Sign out the user and redirect to account-deleted page
      await signOut("/account-deleted");
      console.log("[DangerZone] signOut completed");
    } catch (error) {
      console.error("Failed to delete account:", error);
      // Keep the dialog open to show error state
    }
  };

  return (
    <>
      <div className="p-6">
        <Heading level={2}>Danger Zone</Heading>
        <p className="mb-4 text-sm text-gray-600">
          If you wish to delete your account, you may do so at any time. Your account, your settings, and all your weight data will be deleted from TrendWeight
          servers. If you wish to recreate your account at a later date, you may, but you'll need to reconnect your new account to a scale to redownload any
          weight data from Fitbit or Withings at that time.
        </p>

        <Button type="button" onClick={() => setShowDeleteConfirm(true)} variant="destructive" size="sm" disabled={deleteAccountMutation.isPending}>
          {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (!deleteAccountMutation.isPending) {
            setShowDeleteConfirm(open);
          }
        }}
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
            {deleteAccountMutation.error && (
              <p className="text-sm text-red-600">
                Error: {deleteAccountMutation.error instanceof Error ? deleteAccountMutation.error.message : "Failed to delete account"}
              </p>
            )}
          </div>
        }
        confirmText={deleteAccountMutation.isPending ? "Deleting..." : "Yes, Delete My Account"}
        destructive
        onConfirm={handleDeleteAccount}
      />
    </>
  );
}
