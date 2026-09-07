import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/use-auth";
import { useDisconnectProvider, useClearProviderData, useEnableProvider } from "@/lib/api/mutations";
import { useProviderLinks, useProvidersConfig } from "@/lib/api/queries";
import { useToast } from "@/lib/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExternalLink } from "@/components/common/external-link";
import { Heading } from "@/components/common/heading";
import { getOAuthProviders, FITBIT_SUNSET_ARTICLE_URL, type ProviderMetadata } from "@/lib/utils/provider-display";
import { LegacyRow } from "./legacy-row";
import { ManualCard, ManualRow } from "./manual-tiles";
import type { ProviderActionState, ProviderListVariant } from "./provider-actions";
import { ProviderCard } from "./provider-card";
import { ProviderRow } from "./provider-row";

interface ProviderListProps {
  variant?: ProviderListVariant; // Different layouts for different pages
}

export function ProviderList({ variant = "link" }: ProviderListProps) {
  const { data: providerLinks } = useProviderLinks();
  const { data: providersConfig } = useProvidersConfig();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [disconnectProvider, setDisconnectProvider] = useState<{ id: string; name: string } | null>(null);

  const disconnectMutation = useDisconnectProvider();
  const clearDataMutation = useClearProviderData();
  const enableMutation = useEnableProvider();

  const connectedProviders = new Set(providerLinks?.map((link) => link.provider) || []);
  const disabledProviders = new Set(providersConfig?.disabledProviders || []);
  const oauthProviders = getOAuthProviders();

  const handleConnect = async (providerId: string) => {
    try {
      const endpoint = providerId === "fitbit" ? "/fitbit/link" : "/withings/link";
      const token = await getToken();
      const response = await apiRequest<{ url?: string; authorizationUrl?: string }>(endpoint, { token });
      const redirectUrl = response.authorizationUrl || response.url;
      if (redirectUrl) {
        window.location.assign(redirectUrl);
      }
    } catch (error) {
      console.error(`Error getting ${providerId} authorization URL:`, error);
      showToast({
        title: "Connection Failed",
        description: `Failed to connect to ${providerId}. Please try again.`,
        variant: "error",
      });
    }
  };

  const handleResync = (provider: ProviderMetadata) => {
    clearDataMutation.mutate(provider.id, {
      // Navigate to dashboard which will trigger automatic sync
      onSuccess: () => navigate({ to: "/dashboard" }),
      onError: () => {
        showToast({
          title: "Resync Failed",
          description: `Failed to resync ${provider.name} data. Please try again.`,
          variant: "error",
        });
      },
    });
  };

  const handleToggleLegacy = (isDisabled: boolean) => {
    if (isDisabled) {
      enableMutation.mutate("legacy", {
        onSuccess: () => {
          showToast({ title: "Legacy Data Enabled", description: "Your historical data is now visible in charts and exports.", variant: "success" });
        },
        onError: () => {
          showToast({ title: "Enable Failed", description: "Failed to enable legacy data. Please try again.", variant: "error" });
        },
      });
    } else {
      disconnectMutation.mutate("legacy", {
        onSuccess: () => {
          showToast({ title: "Legacy Data Disabled", description: "Your historical data is now hidden from charts and exports.", variant: "success" });
        },
        onError: () => {
          showToast({ title: "Disable Failed", description: "Failed to disable legacy data. Please try again.", variant: "error" });
        },
      });
    }
  };

  // Suspense handles loading state
  if (!providerLinks) {
    return <div className="text-muted-foreground">Loading providers...</div>;
  }

  const containerClasses = variant === "settings" ? "space-y-4" : "space-y-8 mb-8";

  // Once a provider is shut off, "disconnecting" is really a permanent delete of its
  // synced history (there's nothing left to reconnect to), so the UI says "Delete Data"
  const disconnectIsShutOff = disconnectProvider ? disabledProviders.has(disconnectProvider.id) : false;

  const renderOauthProvider = (provider: ProviderMetadata) => {
    const isConnected = connectedProviders.has(provider.id);
    const providerLink = providerLinks.find((link) => link.provider === provider.id);
    const isShutOff = disabledProviders.has(provider.id);

    // A shut-off provider that isn't connected has nothing to offer - hide it entirely.
    // The link page is about making new connections, so a shut-off provider is hidden
    // there even when connected; managing its remaining data happens in settings.
    if (isShutOff && (!isConnected || variant === "link")) {
      return null;
    }

    const actions: ProviderActionState = {
      isConnected,
      isShutOff,
      // Pending labels only on the provider being acted on; every button waits for the mutation
      resyncPending: clearDataMutation.isPending && clearDataMutation.variables === provider.id,
      resyncDisabled: clearDataMutation.isPending,
      disconnectPending: disconnectMutation.isPending && disconnectMutation.variables === provider.id,
      disconnectDisabled: disconnectMutation.isPending,
      onConnect: () => handleConnect(provider.id),
      onResync: () => handleResync(provider),
      onDisconnect: () => setDisconnectProvider({ id: provider.id, name: provider.name }),
    };

    return variant === "settings" ? (
      <ProviderRow key={provider.id} provider={provider} connectedAt={providerLink?.connectedAt} actions={actions} />
    ) : (
      <ProviderCard key={provider.id} provider={provider} actions={actions} />
    );
  };

  const legacyLink = providerLinks.find((link) => link.provider === "legacy");
  const hasManualEntries = connectedProviders.has("manual");

  return (
    <>
      {variant === "link" && (
        <>
          <Heading level={1} display>
            Connect Your Scale
          </Heading>
          <p className="text-muted-foreground mb-8 text-base sm:text-lg">
            Connect your Withings account to automatically track your weight with TrendWeight — or skip the scale entirely and enter your weight by hand.
          </p>
        </>
      )}

      <div className={`@container ${containerClasses}`}>
        {/* Live providers first; Fitbit is sunsetting, so it lists after the weight log */}
        {oauthProviders.filter((p) => p.id !== "fitbit").map((p) => renderOauthProvider(p))}

        {/* Manual entry is a first-class option, presented like the providers around it */}
        {variant === "settings" ? <ManualRow hasEntries={hasManualEntries} /> : <ManualCard hasEntries={hasManualEntries} />}

        {/* Fitbit last among connections (before legacy data) while it winds down */}
        {oauthProviders.filter((p) => p.id === "fitbit").map((p) => renderOauthProvider(p))}

        {/* Imported classic data can only be shown or hidden, and only from settings */}
        {legacyLink && variant === "settings" && (
          <LegacyRow
            isDisabled={legacyLink.isDisabled || false}
            isPending={enableMutation.isPending || disconnectMutation.isPending}
            onToggle={() => handleToggleLegacy(legacyLink.isDisabled || false)}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!disconnectProvider}
        onOpenChange={(open) => !open && setDisconnectProvider(null)}
        title={disconnectIsShutOff ? `Delete ${disconnectProvider?.name} Data?` : `Disconnect ${disconnectProvider?.name}?`}
        description={
          <div className="space-y-2">
            {disconnectIsShutOff ? (
              <>
                <p>Are you sure you want to delete your {disconnectProvider?.name} data?</p>
                <p className="text-destructive font-medium">
                  Please be careful: {disconnectProvider?.name} syncing has ended for good, so this can't be undone. Your synced {disconnectProvider?.name}{" "}
                  history will be permanently deleted from TrendWeight, and there is no way to re-import it or reconnect. Unless you want this data gone, it's
                  safest to keep it.
                </p>
                {disconnectProvider?.id === "fitbit" && (
                  <p>
                    <ExternalLink href={FITBIT_SUNSET_ARTICLE_URL}>Read more about what's happening</ExternalLink>
                  </p>
                )}
              </>
            ) : (
              <>
                <p>Are you sure you want to disconnect {disconnectProvider?.name}?</p>
                <p>This will remove all weight data from this provider.</p>
                {disconnectProvider?.id === "fitbit" && (
                  <>
                    <p className="text-destructive font-medium">
                      Please be careful: Fitbit support is winding down as Google retires the Fitbit API. If you disconnect now, you may not be able to
                      reconnect later — and your synced Fitbit history will be removed and can't be re-imported. Unless something is wrong, it's safest to leave
                      this connection in place.
                    </p>
                    <p>
                      <ExternalLink href={FITBIT_SUNSET_ARTICLE_URL}>Read more about what's happening</ExternalLink>
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        }
        confirmText={disconnectIsShutOff ? "Delete Data" : "Disconnect"}
        destructive
        onConfirm={() => {
          if (disconnectProvider) {
            disconnectMutation.mutate(disconnectProvider.id, {
              onSuccess: () => {
                showToast({
                  title: disconnectIsShutOff ? "Data Deleted" : "Disconnected",
                  description: disconnectIsShutOff
                    ? `Your ${disconnectProvider.name} data has been deleted.`
                    : `${disconnectProvider.name} has been disconnected successfully.`,
                  variant: "success",
                });
                setDisconnectProvider(null);
              },
              onError: () => {
                showToast({
                  title: disconnectIsShutOff ? "Delete Failed" : "Disconnect Failed",
                  description: `Failed to ${disconnectIsShutOff ? "delete" : "disconnect"} ${disconnectProvider.name}${disconnectIsShutOff ? " data" : ""}. Please try again.`,
                  variant: "error",
                });
                setDisconnectProvider(null);
              },
            });
          }
        }}
      />
    </>
  );
}
