import type { ProviderLink } from "@/lib/api/types";

// A connected provider link as returned by GET /api/providers/links
export function buildProviderLink(provider: string = "withings", overrides: Partial<ProviderLink> = {}): ProviderLink {
  return {
    provider,
    connectedAt: "2024-01-01T08:00:00Z",
    hasToken: true,
    isDisabled: false,
    ...overrides,
  };
}
