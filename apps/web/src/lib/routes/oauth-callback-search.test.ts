import { describe, it, expect } from "vitest";
import { parseOAuthCallbackSearch } from "./oauth-callback-search";

describe("parseOAuthCallbackSearch", () => {
  it("keeps code and state as strings", () => {
    expect(parseOAuthCallbackSearch({ code: "abc", state: 123 })).toEqual({ code: "abc", state: "123" });
  });

  it("drops missing or empty values", () => {
    expect(parseOAuthCallbackSearch({})).toEqual({ code: undefined, state: undefined });
    expect(parseOAuthCallbackSearch({ code: "", state: null })).toEqual({ code: undefined, state: undefined });
  });
});
