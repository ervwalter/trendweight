/**
 * Utilities for determining locale-based defaults
 */

/**
 * Determines if the user should use metric units based on their locale
 * @param locale - The user's locale string (e.g., "en-US", "fr-FR")
 * @returns true if metric units should be used, false for imperial
 */
export function shouldUseMetric(locale?: string): boolean {
  // If no locale provided, try to get from browser
  const userLocale = locale || navigator.language || navigator.languages?.[0] || "en-US";

  // Countries that use imperial units (US, UK, Myanmar, Liberia)
  const imperialCountries = ["US", "GB", "UK", "MM", "LR"];

  // Extract country code from locale (e.g., "en-US" -> "US")
  const countryCode = userLocale.split("-").pop()?.toUpperCase();

  // Default to metric unless in an imperial country
  return !imperialCountries.includes(countryCode || "");
}

/**
 * Extracts the first name from a full name string
 * @param fullName - The full name string
 * @returns The first name or empty string
 */
export function extractFirstName(fullName?: string | null): string {
  if (!fullName) return "";
  if (fullName.includes("@")) return "";

  // Split by space and take the first part
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}
