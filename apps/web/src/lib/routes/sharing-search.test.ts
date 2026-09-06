import { describe, expect, it } from "vitest";
import { parseSharingSearch } from "./sharing-search";

describe("parseSharingSearch", () => {
  it("returns an empty object when nothing is supplied", () => {
    expect(parseSharingSearch({})).toEqual({});
  });

  it("accepts known ranges and modes case-insensitively", () => {
    expect(parseSharingSearch({ range: "3M", mode: "FatPercent" })).toEqual({ range: "3m", mode: "fatpercent" });
  });

  it("falls back to defaults for unknown ranges and modes", () => {
    expect(parseSharingSearch({ range: "2w", mode: "bmi" })).toEqual({ range: "4w", mode: "weight" });
  });

  it("does not allow explore on a shared dashboard", () => {
    expect(parseSharingSearch({ range: "explore" })).toEqual({ range: "4w" });
  });

  it("only enables embed for a literal true", () => {
    expect(parseSharingSearch({ embed: "true" })).toEqual({ embed: true });
    expect(parseSharingSearch({ embed: true })).toEqual({ embed: true });
    expect(parseSharingSearch({ embed: "yes" })).toEqual({});
    expect(parseSharingSearch({ embed: "false" })).toEqual({});
  });

  it("accepts dark as either boolean value and ignores anything else", () => {
    expect(parseSharingSearch({ dark: "true" })).toEqual({ dark: true });
    expect(parseSharingSearch({ dark: false })).toEqual({ dark: false });
    expect(parseSharingSearch({ dark: "auto" })).toEqual({});
  });

  it("rounds width to a positive integer and drops invalid values", () => {
    expect(parseSharingSearch({ width: "640.6" })).toEqual({ width: 641 });
    expect(parseSharingSearch({ width: "-5" })).toEqual({});
    expect(parseSharingSearch({ width: "wide" })).toEqual({});
  });
});
