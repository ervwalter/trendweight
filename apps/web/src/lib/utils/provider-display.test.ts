import { describe, it, expect } from "vitest";
import { getProviderDisplayName, getOAuthProviders } from "./provider-display";

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
    });
  });
});
