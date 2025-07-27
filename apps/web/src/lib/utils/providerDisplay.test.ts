import { describe, it, expect } from "vitest";
import { getProviderDisplayName, getProviderDescription, getProviderNote, getProviderMetadata, getOAuthProviders } from "./providerDisplay";

describe("getProviderDisplayName", () => {
  it("returns correct display names for known providers", () => {
    expect(getProviderDisplayName("withings")).toBe("Withings");
    expect(getProviderDisplayName("fitbit")).toBe("Fitbit");
    expect(getProviderDisplayName("legacy")).toBe("Legacy Data");
  });

  it("capitalizes unknown providers", () => {
    expect(getProviderDisplayName("unknown")).toBe("Unknown");
    expect(getProviderDisplayName("test")).toBe("Test");
  });
});

describe("getProviderDescription", () => {
  it("returns correct descriptions for known providers", () => {
    expect(getProviderDescription("withings")).toContain("Withings creates beautifully designed");
    expect(getProviderDescription("fitbit")).toContain("Fitbit's ecosystem helps you stay motivated");
    expect(getProviderDescription("legacy")).toContain("Historical weight data imported from classic TrendWeight");
  });

  it("returns empty string for unknown providers", () => {
    expect(getProviderDescription("unknown")).toBe("");
  });
});

describe("getProviderNote", () => {
  it("returns correct notes for known providers", () => {
    expect(getProviderNote("withings")).toContain("TrendWeight will automatically import");
    expect(getProviderNote("fitbit")).toContain("TrendWeight will automatically import");
    expect(getProviderNote("legacy")).toContain("This data cannot be synced or updated");
  });

  it("returns empty string for unknown providers", () => {
    expect(getProviderNote("unknown")).toBe("");
  });
});

describe("getProviderMetadata", () => {
  it("returns full metadata for known providers", () => {
    const withings = getProviderMetadata("withings");
    expect(withings).toBeTruthy();
    expect(withings?.id).toBe("withings");
    expect(withings?.supportsOAuth).toBe(true);
    expect(withings?.supportsSync).toBe(true);
    expect(withings?.logo).toBe("/withings-app.png");

    const legacy = getProviderMetadata("legacy");
    expect(legacy).toBeTruthy();
    expect(legacy?.id).toBe("legacy");
    expect(legacy?.supportsOAuth).toBe(false);
    expect(legacy?.supportsSync).toBe(false);
    expect(legacy?.logo).toBe("/legacy-logo.png");
  });

  it("returns null for unknown providers", () => {
    expect(getProviderMetadata("unknown")).toBeNull();
  });
});

describe("getOAuthProviders", () => {
  it("returns only OAuth-enabled providers", () => {
    const oauthProviders = getOAuthProviders();
    expect(oauthProviders).toHaveLength(2);
    expect(oauthProviders.map((p) => p.id)).toContain("withings");
    expect(oauthProviders.map((p) => p.id)).toContain("fitbit");
    expect(oauthProviders.map((p) => p.id)).not.toContain("legacy");
  });

  it("all OAuth providers have required OAuth fields", () => {
    const oauthProviders = getOAuthProviders();
    oauthProviders.forEach((provider) => {
      expect(provider.supportsOAuth).toBe(true);
      expect(provider.logo).toBeTruthy();
      expect(provider.linkUrl).toBeTruthy();
      expect(provider.linkText).toBeTruthy();
    });
  });
});
