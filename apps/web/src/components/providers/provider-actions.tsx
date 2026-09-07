import { Button } from "@/components/ui/button";
import type { ProviderMetadata } from "@/lib/utils/provider-display";

export type ProviderListVariant = "link" | "settings";

/** Per-provider state and handlers computed by ProviderList and rendered by the card/row layouts */
export interface ProviderActionState {
  isConnected: boolean;
  /** The provider's integration has been shut off for good; only its remaining data can be deleted */
  isShutOff: boolean;
  resyncPending: boolean;
  resyncDisabled: boolean;
  disconnectPending: boolean;
  disconnectDisabled: boolean;
  onConnect: () => void;
  onResync: () => void;
  onDisconnect: () => void;
}

interface ProviderActionsProps extends ProviderActionState {
  provider: ProviderMetadata;
  variant: ProviderListVariant;
}

/** The Connect / Resync / Disconnect buttons shared by both ProviderList layouts */
export function ProviderActions({
  provider,
  variant,
  isConnected,
  isShutOff,
  resyncPending,
  resyncDisabled,
  disconnectPending,
  disconnectDisabled,
  onConnect,
  onResync,
  onDisconnect,
}: ProviderActionsProps) {
  const isLink = variant === "link";
  const buttonClassName = isLink ? "@sm:px-6" : undefined;

  if (!isConnected) {
    return (
      <Button type="button" onClick={onConnect} variant={isLink ? "success" : "default"} size="sm" className={buttonClassName}>
        {isLink ? `Connect ${provider.name} Account` : "Connect"}
      </Button>
    );
  }

  // Once a provider is shut off, "disconnecting" is really a permanent delete of its
  // synced history (there's nothing left to reconnect to), so the UI says "Delete Data"
  const disconnectLabel = disconnectPending ? (isShutOff ? "Deleting..." : "Disconnecting...") : isShutOff ? "Delete Data" : "Disconnect";

  return (
    <>
      {/* A shut-off provider cannot fulfill a queued refresh */}
      {!isShutOff && (
        <Button type="button" onClick={onResync} disabled={resyncDisabled} variant="default" size="sm" className={buttonClassName}>
          {resyncPending ? "Syncing..." : isLink ? "Resync Data" : "Resync"}
        </Button>
      )}
      <Button type="button" onClick={onDisconnect} disabled={disconnectDisabled} variant="destructive" size="sm" className={buttonClassName}>
        {disconnectLabel}
      </Button>
    </>
  );
}
