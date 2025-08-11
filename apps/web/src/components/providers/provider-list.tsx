import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { apiRequest } from "../../lib/api/client";
import { useDisconnectProvider, useClearProviderData, useEnableProvider } from "../../lib/api/mutations";
import { useProviderLinks } from "../../lib/api/queries";
import { useToast } from "../../lib/hooks/use-toast";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { ExternalLink } from "../common/external-link";
import { Heading } from "../common/heading";
import { getProviderDisplayName, getOAuthProviders } from "../../lib/utils/provider-display";

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

export function ProviderList({ variant = "link", showHeader = true }: ProviderListProps) {
  const { data: providerLinks } = useProviderLinks();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [disconnectProvider, setDisconnectProvider] = useState<{ id: string; name: string } | null>(null);

  const disconnectMutation = useDisconnectProvider();
  const clearDataMutation = useClearProviderData();
  const enableMutation = useEnableProvider();

  const connectedProviders = new Set(providerLinks?.map((link) => link.provider) || []);
  const oauthProviders = getOAuthProviders();

  const handleConnect = async (providerId: string) => {
    try {
      const endpoint = providerId === "fitbit" ? "/fitbit/link" : "/withings/link";
      const response = await apiRequest<{ url?: string; authorizationUrl?: string }>(endpoint);
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

  return (
    <>
      {showHeader && variant === "link" && (
        <>
          <Heading level={1} display>
            Connect Your Scale
          </Heading>
          <p className="text-muted-foreground mb-2 text-base sm:text-lg">
            Connect your Withings or Fitbit account to automatically track your weight with TrendWeight. When you're ready, click one of the options below and
            authorize TrendWeight to access your weight data.
          </p>
          <p className="text-muted-foreground mb-8 text-sm sm:text-base">
            <span className="font-semibold">Don't have a smart scale?</span> No problem! You can manually enter your weight in either app and TrendWeight will
            still track your trends.
          </p>
        </>
      )}

      <div className={`@container ${containerClasses}`}>
        {/* First show regular providers */}
        {oauthProviders.map((provider) => {
          const isConnected = connectedProviders.has(provider.id);
          const providerLink = providerLinks?.find((link) => link.provider === provider.id);

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
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end @sm:self-auto">
                  {isConnected ? (
                    <>
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
                      <Button
                        type="button"
                        onClick={() => setDisconnectProvider({ id: provider.id, name: provider.name })}
                        disabled={disconnectMutation.isPending}
                        variant="destructive"
                        size="sm"
                      >
                        {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
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
                  <p className="text-muted-foreground mb-3 text-sm @sm:text-base">{provider.description}</p>
                  {provider.linkUrl && provider.linkText && (
                    <p className="text-muted-foreground mb-3 text-sm @sm:text-base">
                      <ExternalLink href={provider.linkUrl} className="font-medium">
                        {provider.linkText}
                      </ExternalLink>
                    </p>
                  )}
                  <p className="text-muted-foreground mb-4 text-xs italic @sm:text-sm">{provider.note}</p>
                  {isConnected ? (
                    <div className="flex flex-col gap-2 @sm:flex-row">
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
                      <Button
                        onClick={() => setDisconnectProvider({ id: provider.id, name: provider.name })}
                        disabled={disconnectMutation.isPending}
                        variant="destructive"
                        size="sm"
                        className="@sm:px-6"
                      >
                        {disconnectMutation.isPending && disconnectMutation.variables === provider.id ? "Disconnecting..." : "Disconnect"}
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
        })}

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
        title={`Disconnect ${disconnectProvider?.name}?`}
        description={
          <div className="space-y-2">
            <p>Are you sure you want to disconnect {disconnectProvider?.name}?</p>
            <p>This will remove all weight data from this provider.</p>
          </div>
        }
        confirmText="Disconnect"
        destructive
        onConfirm={() => {
          if (disconnectProvider) {
            disconnectMutation.mutate(disconnectProvider.id, {
              onSuccess: () => {
                showToast({
                  title: "Disconnected",
                  description: `${disconnectProvider.name} has been disconnected successfully.`,
                  variant: "success",
                });
                setDisconnectProvider(null);
              },
              onError: () => {
                showToast({
                  title: "Disconnect Failed",
                  description: `Failed to disconnect ${disconnectProvider.name}. Please try again.`,
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
