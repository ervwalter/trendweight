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
    linkUrl: "https://www.fitbit.com/global/us/products/scales",
    linkText: "Get a Fitbit Aria scale",
    description:
      "Fitbit's ecosystem helps you stay motivated and reach your goals with smart scales that measure weight and body fat percentage. Your stats sync automatically to the Fitbit app where you can see trends, log food, and track activity.",
    note: "TrendWeight will automatically import your daily weight measurements from Fitbit. You can also manually log weights in the Fitbit app or website if you don't have an Aria scale.",
    supportsOAuth: true,
    supportsSync: true,
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
