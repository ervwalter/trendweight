import type { FC } from "react";
import type { ProviderSyncStatus } from "@/lib/api/types";
import ProviderSyncError from "./provider-sync-error";

interface ProviderSyncErrorsProps {
  providerStatus?: Record<string, ProviderSyncStatus>;
}

const ProviderSyncErrors: FC<ProviderSyncErrorsProps> = ({ providerStatus }) => {
  if (!providerStatus) {
    return null;
  }

  // Get all providers with errors
  const providersWithErrors = Object.entries(providerStatus)
    .filter(([, status]) => !status.success && status.error)
    .sort(([a], [b]) => a.localeCompare(b)); // Sort alphabetically for consistent display

  if (providersWithErrors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {providersWithErrors.map(([provider, status]) => (
        <ProviderSyncError key={provider} provider={provider} status={status} />
      ))}
    </div>
  );
};

export default ProviderSyncErrors;
