import { Modes, TimeRanges, type Mode, type TimeRange } from "@/lib/core/interfaces";

export interface SharingSearch {
  range?: TimeRange;
  mode?: Mode;
  embed?: boolean;
  dark?: boolean;
  width?: number;
}

// Explore mode has no place on a shared or embedded dashboard
export const SHARED_RANGES: TimeRange[] = (Object.keys(TimeRanges) as TimeRange[]).filter((range) => range !== "explore");
const MODES = Object.keys(Modes) as Mode[];

/**
 * Validates the search params accepted by the shared dashboard (/u/$sharingCode).
 * Unknown values fall back to a default rather than failing the route.
 */
export function parseSharingSearch(search: Record<string, unknown>): SharingSearch {
  const result: SharingSearch = {};

  // Case-insensitive; an unrecognised value gets the default rather than an error
  if (search.range) {
    const normalized = String(search.range).toLowerCase();
    result.range = SHARED_RANGES.includes(normalized as TimeRange) ? (normalized as TimeRange) : "4w";
  }

  if (search.mode) {
    const normalized = String(search.mode).toLowerCase();
    result.mode = MODES.includes(normalized as Mode) ? (normalized as Mode) : "weight";
  }

  // Only the literal true enables embedding
  if (search.embed === "true" || search.embed === true) {
    result.embed = true;
  }

  if (search.dark === "true" || search.dark === true) {
    result.dark = true;
  } else if (search.dark === "false" || search.dark === false) {
    result.dark = false;
  }

  if (search.width) {
    const width = Math.round(Number(search.width));
    if (!isNaN(width) && width > 0) {
      result.width = width;
    }
  }

  return result;
}
