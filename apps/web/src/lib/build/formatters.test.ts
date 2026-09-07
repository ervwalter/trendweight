import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatBuildTime } from "./formatters";

describe("formatBuildTime", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    ["2024-01-15T11:59:00Z", "1 minute ago"],
    ["2024-01-15T11:55:00Z", "5 minutes ago"],
    ["2024-01-15T11:00:00Z", "1 hour ago"],
    ["2024-01-15T09:00:00Z", "3 hours ago"],
    ["2024-01-14T12:00:00Z", "1 day ago"],
    ["2024-01-12T12:00:00Z", "3 days ago"],
  ])("describes the age of %s as %s", (timestamp, ageText) => {
    const info = formatBuildTime(timestamp);

    expect(typeof info).toBe("object");
    expect((info as { ageText: string }).ageText).toBe(ageText);
  });

  it("formats the build time in UTC and the viewer's locale", () => {
    const info = formatBuildTime("2024-01-14T12:00:00Z") as { localTime: string; utcTime: string };

    expect(info.utcTime).toBe("Sun, 14 Jan 2024 12:00:00 GMT");
    expect(info.localTime).toBe(new Date("2024-01-14T12:00:00Z").toLocaleString());
  });

  it("passes the 'Not available' placeholder through unchanged", () => {
    expect(formatBuildTime("Not available")).toBe("Not available");
  });

  it("returns an unparseable timestamp unchanged instead of 'Invalid Date' and 'NaN days ago'", () => {
    expect(formatBuildTime("garbage")).toBe("garbage");
  });
});
