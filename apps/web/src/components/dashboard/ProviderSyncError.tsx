import type { FC } from "react";
import { useReconnectProvider } from "../../lib/api/mutations";
import type { ProviderSyncStatus } from "../../lib/api/types";
import { Button } from "../ui/button";

interface ProviderSyncErrorProps {
  provider: string;
  status: ProviderSyncStatus;
}

const ProviderSyncError: FC<ProviderSyncErrorProps> = ({ provider, status }) => {
  const reconnectProvider = useReconnectProvider();

  // Skip if no error
  if (status.success || !status.error) {
    return null;
  }

  const providerDisplayName = provider === "fitbit" ? "Fitbit" : "Withings";

  const handleReconnect = async () => {
    try {
      const response = await reconnectProvider.mutateAsync(provider);

      // Redirect to the authorization URL
      const authUrl = response.url || response.authorizationUrl;
      if (authUrl) {
        window.location.assign(authUrl);
      }
    } catch (error) {
      console.error(`Error initiating ${provider} reconnection:`, error);
    }
  };

  // Determine the error message and button text based on error type
  let errorMessage: string;
  let buttonText = "Reconnect →";

  switch (status.error) {
    case "authfailed":
      errorMessage = `${providerDisplayName} connection needs to be refreshed.`;
      break;
    case "networkerror":
      errorMessage = `Unable to connect to ${providerDisplayName}. Please wait a moment and try again. If this keeps happening, you can try reconnecting.`;
      buttonText = "Reconnect anyway →";
      break;
    default:
      errorMessage =
        status.message || `${providerDisplayName} sync failed. Please wait a moment and try again. If this keeps happening, you can try reconnecting.`;
      buttonText = "Reconnect anyway →";
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center space-x-3">
        <span className="text-xl text-amber-600" role="img" aria-label="Warning">
          ⚠️
        </span>
        <span className="flex-1 text-amber-800">{errorMessage}</span>
      </div>
      <Button
        onClick={handleReconnect}
        disabled={reconnectProvider.isPending}
        variant="warning"
        size="sm"
        className="ml-4 whitespace-nowrap focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
      >
        {reconnectProvider.isPending ? "Loading..." : buttonText}
      </Button>
    </div>
  );
};

export default ProviderSyncError;
