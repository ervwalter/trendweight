import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { apiRequest } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/use-auth";
import { useDisconnectProvider, useClearProviderData, useEnableProvider } from "@/lib/api/mutations";
import { useProviderLinks, useProvidersConfig } from "@/lib/api/queries";
import { useToast } from "@/lib/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ExternalLink } from "@/components/common/external-link";
import { Heading } from "@/components/common/heading";
import { NotePencilIcon } from "@/components/common/note-pencil-icon";
import { getProviderDisplayName, getOAuthProviders, FITBIT_SUNSET_ARTICLE_URL, type ProviderMetadata } from "@/lib/utils/provider-display";

// Simple date formatter for connection dates
const connectionDateFormatter = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

interface ProviderListProps {
  variant?: "link" | "settings"; // Different layouts for different pages
  showHeader?: boolean;
}

// Shown for a still-connected provider after its integration has been shut off for good
const fitbitEndedNote =
  "Fitbit syncing has ended — Google retired the Fitbit API that TrendWeight used. Your Fitbit history is preserved and keeps appearing in your charts.";

export function ProviderList({ variant = "link", showHeader = true }: ProviderListProps) {
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
    const providerLink = providerLinks?.find((link) => link.provider === provider.id);
    const isShutOff = disabledProviders.has(provider.id);

    // A shut-off provider that isn't connected has nothing to offer - hide it entirely.
    // The link page is about making new connections, so a shut-off provider is hidden
    // there even when connected; managing its remaining data happens in settings.
    if (isShutOff && (!isConnected || variant === "link")) {
      return null;
    }

    if (variant === "settings") {
      // Compact layout for settings page
      return (
        <div
          key={provider.id}
          className="border-border flex flex-col space-y-3 rounded-lg border p-4 @sm:flex-row @sm:items-center @sm:justify-between @sm:space-y-0"
        >
          <div className="flex items-center space-x-3">
            <img src={provider.logo} alt={provider.name} className="h-10 w-10" />
            <div>
              <Heading level={3} className="text-foreground">
                {provider.name}
              </Heading>
              <p className="text-muted-foreground text-sm">
                {isConnected ? `Connected ${connectionDateFormatter.format(new Date(providerLink!.connectedAt))}` : "Not connected"}
              </p>
              {provider.id === "fitbit" && (
                <p className="text-muted-foreground text-sm">
                  {isShutOff ? fitbitEndedNote : "Google is retiring the Fitbit API — syncing is expected to end in September 2026."}{" "}
                  <ExternalLink href={FITBIT_SUNSET_ARTICLE_URL}>Read more about what's happening</ExternalLink>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end @sm:self-auto">
            {isConnected ? (
              <>
                {/* Resync clears data before re-syncing; with syncing shut off it would permanently destroy history */}
                {!isShutOff && (
                  <Button
                    type="button"
                    onClick={() => {
                      clearDataMutation.mutate(provider.id, {
                        onSuccess: () => {
                          // Navigate to dashboard which will trigger automatic sync
                          navigate({ to: "/dashboard" });
                        },
                        onError: () => {
                          showToast({
                            title: "Resync Failed",
                            description: `Failed to resync ${provider.name} data. Please try again.`,
                            variant: "error",
                          });
                        },
                      });
                    }}
                    disabled={clearDataMutation.isPending}
                    variant="default"
                    size="sm"
                  >
                    {clearDataMutation.isPending && clearDataMutation.variables === provider.id ? "Syncing..." : "Resync"}
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => setDisconnectProvider({ id: provider.id, name: provider.name })}
                  disabled={disconnectMutation.isPending}
                  variant="destructive"
                  size="sm"
                >
                  {disconnectMutation.isPending ? (isShutOff ? "Deleting..." : "Disconnecting...") : isShutOff ? "Delete Data" : "Disconnect"}
                </Button>
              </>
            ) : (
              <Button onClick={() => handleConnect(provider.id)} variant="default" size="sm">
                Connect
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Full layout for link page
    return (
      <div key={provider.id} className="border-border bg-muted relative rounded-lg border p-4 @sm:p-6">
        {isConnected && (
          <div className="absolute top-4 right-4">
            <CheckCircle className="text-success h-5 w-5 @sm:h-6 @sm:w-6" />
          </div>
        )}
        <Heading level={2}>{provider.displayName}</Heading>
        <div className="flex flex-col gap-4 @md:flex-row @md:gap-6">
          <div className="flex-shrink-0 self-center @md:self-start">
            <img src={provider.logo} alt={`${provider.name} logo`} className="h-auto w-24 @sm:w-32 @md:w-48" />
          </div>
          <div className="flex-1">
            <p className="text-muted-foreground mb-3 text-sm @sm:text-base">{isShutOff ? fitbitEndedNote : provider.description}</p>
            {provider.linkUrl && provider.linkText && (
              <p className="text-muted-foreground mb-3 text-sm @sm:text-base">
                <ExternalLink href={provider.linkUrl} className="font-medium">
                  {provider.linkText}
                </ExternalLink>
              </p>
            )}
            <p className="text-muted-foreground mb-4 text-xs italic @sm:text-sm">
              {provider.note}
              {provider.learnMoreUrl && (
                <>
                  {" "}
                  <ExternalLink href={provider.learnMoreUrl}>Read more about what's happening</ExternalLink>
                </>
              )}
            </p>
            {isConnected ? (
              <div className="flex flex-col gap-2 @sm:flex-row">
                {/* Resync clears data before re-syncing; with syncing shut off it would permanently destroy history */}
                {!isShutOff && (
                  <Button
                    onClick={() => {
                      clearDataMutation.mutate(provider.id, {
                        onSuccess: () => {
                          // Navigate to dashboard which will trigger automatic sync
                          navigate({ to: "/dashboard" });
                        },
                        onError: () => {
                          showToast({
                            title: "Resync Failed",
                            description: `Failed to resync ${provider.name} data. Please try again.`,
                            variant: "error",
                          });
                        },
                      });
                    }}
                    disabled={clearDataMutation.isPending}
                    variant="default"
                    size="sm"
                    className="@sm:px-6"
                  >
                    {clearDataMutation.isPending && clearDataMutation.variables === provider.id ? "Syncing..." : "Resync Data"}
                  </Button>
                )}
                <Button
                  onClick={() => setDisconnectProvider({ id: provider.id, name: provider.name })}
                  disabled={disconnectMutation.isPending}
                  variant="destructive"
                  size="sm"
                  className="@sm:px-6"
                >
                  {disconnectMutation.isPending && disconnectMutation.variables === provider.id
                    ? isShutOff
                      ? "Deleting..."
                      : "Disconnecting..."
                    : isShutOff
                      ? "Delete Data"
                      : "Disconnect"}
                </Button>
              </div>
            ) : (
              <Button onClick={() => handleConnect(provider.id)} variant="success" size="sm" className="@sm:px-6">
                Connect {provider.name} Account
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {showHeader && variant === "link" && (
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

        {/* Manual entry alongside the other connections on the settings page */}
        {variant === "settings" && (
          <div className="border-border flex flex-col space-y-3 rounded-lg border p-4 @sm:flex-row @sm:items-center @sm:justify-between @sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="bg-manual-tile flex h-10 w-10 items-center justify-center rounded-md">
                <NotePencilIcon className="h-7 w-7 text-black/80" accentClassName="fill-primary" />
              </div>
              <div>
                <Heading level={3} className="text-foreground">
                  Weight Log
                </Heading>
                <p className="text-muted-foreground text-sm">
                  {connectedProviders.has("manual") ? "Weights you've entered yourself" : "No smart scale needed — log weights yourself"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end @sm:self-auto">
              <Button asChild variant="default" size="sm">
                <Link to="/log">Edit</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Manual entry is a first-class option on the link page, presented like the providers above */}
        {variant === "link" && (
          <div className="border-border bg-muted relative rounded-lg border p-4 @sm:p-6">
            {connectedProviders.has("manual") && (
              <div className="absolute top-4 right-4">
                <CheckCircle className="text-success h-5 w-5 @sm:h-6 @sm:w-6" />
              </div>
            )}
            <Heading level={2}>Log It Yourself</Heading>
            <div className="flex flex-col gap-4 @md:flex-row @md:gap-6">
              <div className="flex-shrink-0 self-center @md:self-start">
                <div className="bg-manual-tile flex h-24 w-24 items-center justify-center rounded-2xl @sm:h-32 @sm:w-32 @md:h-48 @md:w-48">
                  <NotePencilIcon className="h-16 w-16 text-black/80 @sm:h-22 @sm:w-22 @md:h-32 @md:w-32" accentClassName="fill-primary" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground mb-3 text-sm @sm:text-base">
                  No smart scale? No problem. Type in your weight whenever you weigh in, and TrendWeight gives you the same trend analysis, charts, and stats as
                  a connected scale.
                </p>
                <p className="text-muted-foreground mb-4 text-xs italic @sm:text-sm">
                  Your weight log works alongside connected scales too — you can mix and match.
                </p>
                <Button asChild variant="success" size="sm" className="@sm:px-6">
                  <Link to="/log">Log Your Weight</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Fitbit last among connections (before legacy data) while it winds down */}
        {oauthProviders.filter((p) => p.id === "fitbit").map((p) => renderOauthProvider(p))}

        {/* Show legacy provider if it exists */}
        {providerLinks?.some((link) => link.provider === "legacy") && (
          <>
            {(() => {
              const legacyLink = providerLinks.find((link) => link.provider === "legacy");
              if (!legacyLink) return null;

              const isDisabled = legacyLink.isDisabled || false;

              if (variant === "settings") {
                // Compact layout for settings page
                return (
                  <div key="legacy" className="border-border rounded-lg border p-4">
                    <div className="flex flex-col space-y-4">
                      {/* Header section */}
                      <div className="flex flex-col space-y-3 @sm:flex-row @sm:items-center @sm:justify-between @sm:space-y-0">
                        <div className="flex items-center space-x-3">
                          <img src="/legacy-logo.png" alt="Legacy Data" className="h-10 w-10" />
                          <div>
                            <Heading level={3} className="text-foreground">
                              {getProviderDisplayName("legacy")}
                            </Heading>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 self-end @sm:self-auto">
                          <Button
                            type="button"
                            onClick={() => {
                              if (isDisabled) {
                                // Enable the legacy provider
                                enableMutation.mutate("legacy", {
                                  onSuccess: () => {
                                    showToast({
                                      title: "Legacy Data Enabled",
                                      description: "Your historical data is now visible in charts and exports.",
                                      variant: "success",
                                    });
                                  },
                                  onError: () => {
                                    showToast({
                                      title: "Enable Failed",
                                      description: "Failed to enable legacy data. Please try again.",
                                      variant: "error",
                                    });
                                  },
                                });
                              } else {
                                // Disable the legacy provider
                                disconnectMutation.mutate("legacy", {
                                  onSuccess: () => {
                                    showToast({
                                      title: "Legacy Data Disabled",
                                      description: "Your historical data is now hidden from charts and exports.",
                                      variant: "success",
                                    });
                                  },
                                  onError: () => {
                                    showToast({
                                      title: "Disable Failed",
                                      description: "Failed to disable legacy data. Please try again.",
                                      variant: "error",
                                    });
                                  },
                                });
                              }
                            }}
                            disabled={enableMutation.isPending || disconnectMutation.isPending}
                            variant={isDisabled ? "default" : "destructive"}
                            size="sm"
                          >
                            {enableMutation.isPending || disconnectMutation.isPending
                              ? isDisabled
                                ? "Enabling..."
                                : "Disabling..."
                              : isDisabled
                                ? "Enable"
                                : "Disable"}
                          </Button>
                        </div>
                      </div>

                      {/* Description and note - always visible for legacy */}
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-sm">
                          Historical weight data imported from classic TrendWeight. This data was migrated from your previous account and provides your complete
                          weight history.
                        </p>
                        <p className="text-muted-foreground text-xs italic">
                          This data cannot be synced or updated. You can enable or disable its visibility in your charts and exports.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Full layout for link page (legacy provider shouldn't appear here, but handle just in case)
              return null;
            })()}
          </>
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
