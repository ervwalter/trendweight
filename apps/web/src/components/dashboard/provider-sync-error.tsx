import type { FC } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useReconnectProvider } from "@/lib/api/mutations";
import type { ProviderSyncStatus } from "@/lib/api/types";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { getProviderDisplayName, FITBIT_SUNSET_ARTICLE_URL } from "@/lib/utils/provider-display";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/common/external-link";

interface ProviderSyncErrorProps {
  provider: string;
  status: ProviderSyncStatus;
}

const ProviderSyncError: FC<ProviderSyncErrorProps> = ({ provider, status }) => {
  const reconnectProvider = useReconnectProvider();
  // "disabled" is a permanent state, not a transient error - dismissible so long-term
  // users who keep their history connected aren't nagged on every dashboard visit
  const [dismissedShutdown, setDismissedShutdown] = usePersistedState(`providerShutdownNoticeDismissed-${provider}`, false);

  // Skip if no error; manual and legacy never sync, so they never show errors
  if (status.success || !status.error || provider === "manual" || provider === "legacy") {
    return null;
  }

  const providerDisplayName = getProviderDisplayName(provider);

  // The provider integration has been shut off for good (e.g. Fitbit after Google
  // retired its API): explain once, offer no reconnect (there's nothing to reconnect to)
  if (status.error === "disabled") {
    // Auto-hide after March 1, 2027 (~6 months past the expected shutdown) so a fresh
    // browser with no saved dismissal isn't still shown this notice long after the news
    const shutdownNoticeCutoff = new Date("2027-03-01");
    if (dismissedShutdown || new Date() >= shutdownNoticeCutoff) {
      return null;
    }

    return (
      <div className="border-warning/50 bg-warning/15 mb-4 flex items-start rounded-lg border p-4">
        <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="text-foreground/90 ml-3 flex-1">
          <p>
            {providerDisplayName} syncing has ended — Google retired the API it relied on. Your {providerDisplayName} history is preserved and still appears in
            your charts.
          </p>
          <p className="mt-1">
            To keep new weigh-ins flowing, use the built-in{" "}
            <Link to="/log" className="text-link hover:text-link underline">
              weight log
            </Link>{" "}
            or connect a Withings scale. <ExternalLink href={FITBIT_SUNSET_ARTICLE_URL}>Read more about what's happening</ExternalLink>
          </p>
          <p className="text-foreground/70 mt-1 text-sm">Once you've read this, use the &times; to dismiss this message for good.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissedShutdown(true)}
          className="hover:bg-warning/20 -my-2 -mr-2 ml-4"
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

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
      buttonText = "Try reconnecting →";
      break;
    default:
      errorMessage =
        status.message || `${providerDisplayName} sync failed. Please wait a moment and try again. If this keeps happening, you can try reconnecting.`;
      buttonText = "Try reconnecting →";
  }

  return (
    <div className="border-warning/50 bg-warning/15 mb-4 flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center space-x-3">
        <AlertTriangle className="text-warning size-5 shrink-0" aria-hidden="true" />
        <span className="text-foreground/90 flex-1">{errorMessage}</span>
      </div>
      <Button
        onClick={handleReconnect}
        disabled={reconnectProvider.isPending}
        variant="warning"
        size="sm"
        className="focus:ring-warning ml-4 whitespace-nowrap focus:ring-2 focus:ring-offset-2"
      >
        {reconnectProvider.isPending ? "Loading..." : buttonText}
      </Button>
    </div>
  );
};

export default ProviderSyncError;
