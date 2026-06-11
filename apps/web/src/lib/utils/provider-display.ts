// Blog post explaining the Fitbit API retirement and what TrendWeight users can do about it
export const FITBIT_SUNSET_ARTICLE_URL = "https://ewal.dev/fitbit-google-health-and-whats-next";

// Provider metadata interface
export interface ProviderMetadata {
  id: string;
  name: string;
  displayName: string;
  logo?: string;
  linkUrl?: string;
  linkText?: string;
  description: string;
  note: string;
  learnMoreUrl?: string;
  supportsOAuth: boolean;
  supportsSync: boolean;
}

// Static provider metadata
const providerMetadata: Record<string, ProviderMetadata> = {
  withings: {
    id: "withings",
    name: "Withings",
    displayName: "Withings Account",
    logo: "/withings-app.png",
    linkUrl: "https://www.withings.com/us/en/scales",
    linkText: "Get a Withings scale",
    description:
      "Withings creates beautifully designed, easy-to-use smart scales that automatically sync your weight measurements to their Health Mate app. Track your weight, body composition, and long-term trends to achieve your health goals.",
    note: "TrendWeight will automatically import your daily weight measurements from Withings. You can also manually enter weights in the Health Mate app if you don't have a smart scale.",
    supportsOAuth: true,
    supportsSync: true,
  },
  fitbit: {
    id: "fitbit",
    name: "Fitbit",
    displayName: "Fitbit Account",
    logo: "/fitbit-app.png",
    description:
      "Connect your Fitbit account and TrendWeight will automatically import your weight measurements. Heads-up: Google is retiring the Fitbit API that TrendWeight uses, so Fitbit syncing is expected to stop in September 2026.",
    note: "Any Fitbit weight history already in TrendWeight stays put and keeps appearing in your charts even after syncing ends.",
    learnMoreUrl: FITBIT_SUNSET_ARTICLE_URL,
    supportsOAuth: true,
    supportsSync: true,
  },
  manual: {
    id: "manual",
    name: "Weight Log",
    displayName: "Weight Log",
    description: "Weights you entered yourself, either in TrendWeight or through the TrendWeight API.",
    note: "Logged weights appear in your charts and exports alongside data from connected scales.",
    supportsOAuth: false,
    supportsSync: false,
  },
  legacy: {
    id: "legacy",
    name: "Legacy Data",
    displayName: "Legacy Data",
    logo: "/legacy-logo.png",
    description:
      "Historical weight data imported from classic TrendWeight. This data was migrated from your previous account and provides your complete weight history.",
    note: "This data cannot be synced or updated. You can enable or disable its visibility in your charts and exports.",
    supportsOAuth: false,
    supportsSync: false,
  },
};

// Get full provider metadata
export function getProviderMetadata(providerId: string): ProviderMetadata | null {
  return providerMetadata[providerId] || null;
}

// Get all OAuth-enabled providers
export function getOAuthProviders(): ProviderMetadata[] {
  return Object.values(providerMetadata).filter((p) => p.supportsOAuth);
}

// Map provider IDs to display names
export function getProviderDisplayName(providerId: string): string {
  const metadata = providerMetadata[providerId];
  return metadata?.name || providerId.charAt(0).toUpperCase() + providerId.slice(1);
}

// Map provider IDs to descriptions
export function getProviderDescription(providerId: string): string {
  const metadata = providerMetadata[providerId];
  return metadata?.description || "";
}

// Map provider IDs to notes
export function getProviderNote(providerId: string): string {
  const metadata = providerMetadata[providerId];
  return metadata?.note || "";
}
