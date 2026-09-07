import type { ProfileResponse } from "@/lib/api/types";
import type { ProfileData } from "@/lib/core/interfaces";

// Every ProfileData field is set to a value that differs from what a dropped mapping would
// produce (undefined / the app's fallback defaults), so `toEqual(buildProfileData())` fails if a
// field stops being copied.
export function buildProfileData(overrides: Partial<ProfileData> = {}): ProfileData {
  return {
    firstName: "Alex",
    goalStart: "2023-11-01",
    goalWeight: 75,
    plannedPoundsPerWeek: -1,
    dayStartOffset: 3,
    useMetric: true,
    showCalories: true,
    isNewlyMigrated: false,
    hideDataBeforeStart: true,
    trendAlgorithm: "ewma",
    ...overrides,
  };
}

export interface ProfileResponseOverrides extends Partial<Omit<ProfileResponse, "user">> {
  user?: Partial<ProfileData>;
}

// GET /api/profile response wrapping buildProfileData()
export function buildProfileResponse({ user, ...overrides }: ProfileResponseOverrides = {}): ProfileResponse {
  return {
    user: buildProfileData(user),
    timestamp: "2024-01-15T12:00:00Z",
    isMe: true,
    ...overrides,
  };
}
