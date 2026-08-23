import type { ProfileData } from "@/lib/core/interfaces";

// Response structure from the profile API endpoint
export interface ProfileResponse {
  user: ProfileData;
  timestamp: string;
  isMe?: boolean;
}

export interface Measurement {
  date: string;
  weight: number;
  trend?: number;
  change?: number;
}

// Provider availability from GET /api/providers/config
export interface ProvidersConfig {
  // Providers that no longer accept new connections or syncs (e.g. "fitbit"
  // once Google retires its API). Existing data remains visible.
  disabledProviders: string[];
}

// API key metadata from GET /api/profile/api-key (never contains the key itself)
export interface ApiKeyMetadata {
  exists: boolean;
  suffix?: string; // last 4 chars of the key, for display as "sk-…wxyz"
  createdAt?: string; // ISO timestamp
}

// Result of POST /api/profile/api-key - the plaintext key is returned exactly once
export interface GeneratedApiKey {
  apiKey: string;
  suffix: string;
  createdAt: string;
}

// A manually entered reading from /api/measurements/manual (one per date)
export interface ManualReading {
  date: string; // "2024-01-15" (user's local timezone)
  weight: number; // always kg
  fatRatio?: number; // 0-1 ratio, not a percentage
}

// Source data from /api/data endpoint
export interface ApiSourceData {
  source: string; // "withings", "fitbit", "legacy", or "manual"
  lastUpdate: string; // ISO timestamp
  measurements?: Array<{
    date: string; // "2024-01-15"
    time: string; // "06:30:00"
    weight: number;
    fatRatio?: number;
  }>;
}

// Provider link from /api/providers/links endpoint
export interface ProviderLink {
  provider: string;
  connectedAt: string;
  updateReason?: string;
  hasToken: boolean;
  isDisabled?: boolean;
}

// Provider sync status
export interface ProviderSyncStatus {
  success: boolean;
  error?: "authfailed" | "networkerror" | "unknown" | "disabled";
  message?: string;
}

// Computed measurement from backend (optimized)
export interface ApiComputedMeasurement {
  date: string; // YYYY-MM-DD format (converted to LocalDate in queries)
  actualWeight: number;
  trendWeight: number;
  weightIsInterpolated: boolean;
  fatIsInterpolated: boolean;
  actualFatPercent?: number; // 0-1 ratio
  trendFatPercent?: number; // 0-1 ratio
  trendFatMass?: number; // kg, calculated as independent moving average
  trendLeanMass?: number; // kg, calculated as independent moving average
}

// Enhanced measurements response from /api/data endpoint
export interface MeasurementsResponse {
  computedMeasurements: ApiComputedMeasurement[];
  sourceData?: ApiSourceData[]; // Only when includeSource=true
  providerStatus?: Record<string, ProviderSyncStatus>;
  isMe: boolean;
}

// API error response with error codes
export interface ApiErrorResponse {
  error: string;
  errorCode?: string;
  isRetryable?: boolean;
}

export const ErrorCodes = {
  RATE_LIMITED: "RATE_LIMITED",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_CODE: "INVALID_CODE",
  FORBIDDEN: "FORBIDDEN",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  UNEXPECTED_ERROR: "UNEXPECTED_ERROR",
} as const;
