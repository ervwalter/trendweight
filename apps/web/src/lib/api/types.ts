import type { ProfileData } from "../core/interfaces";

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

// Source data from /api/data endpoint
export interface ApiSourceData {
  source: string; // "withings" or "fitbit"
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
}

// Provider sync status
export interface ProviderSyncStatus {
  success: boolean;
  error?: "authfailed" | "networkerror" | "unknown";
  message?: string;
}

// Enhanced measurements response from /api/data endpoint
export interface MeasurementsResponse {
  data: ApiSourceData[];
  providerStatus: Record<string, ProviderSyncStatus>;
  isMe?: boolean;
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
