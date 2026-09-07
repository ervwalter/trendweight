import { ExternalLink } from "@/components/common/external-link";
import { Heading } from "@/components/common/heading";
import { FITBIT_ENDED_NOTE, FITBIT_SUNSET_ARTICLE_URL, type ProviderMetadata } from "@/lib/utils/provider-display";
import { ProviderActions, type ProviderActionState } from "./provider-actions";

// Simple date formatter for connection dates
const connectionDateFormatter = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

interface ProviderRowProps {
  provider: ProviderMetadata;
  /** When the account was connected; undefined while not connected */
  connectedAt?: string;
  actions: ProviderActionState;
}

/** Compact provider row used on the settings page */
export function ProviderRow({ provider, connectedAt, actions }: ProviderRowProps) {
  return (
    <div className="border-border flex flex-col space-y-3 rounded-lg border p-4 @sm:flex-row @sm:items-center @sm:justify-between @sm:space-y-0">
      <div className="flex items-center space-x-3">
        <img src={provider.logo} alt={provider.name} className="h-10 w-10" />
        <div>
          <Heading level={3} className="text-foreground">
            {provider.name}
          </Heading>
          <p className="text-muted-foreground text-sm">
            {actions.isConnected && connectedAt ? `Connected ${connectionDateFormatter.format(new Date(connectedAt))}` : "Not connected"}
          </p>
          {provider.id === "fitbit" && (
            <p className="text-muted-foreground text-sm">
              {actions.isShutOff ? FITBIT_ENDED_NOTE : "Google is retiring the Fitbit API — syncing is expected to end in September 2026."}{" "}
              <ExternalLink href={FITBIT_SUNSET_ARTICLE_URL}>Read more about what's happening</ExternalLink>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end @sm:self-auto">
        <ProviderActions provider={provider} variant="settings" {...actions} />
      </div>
    </div>
  );
}
