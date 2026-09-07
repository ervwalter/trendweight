import { describe, it, expect, vi, afterEach } from "vitest";
import { getBrowserInfo } from "./browser-info";

const userAgents = {
  edge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.2739.42",
  chrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  firefox: "Mozilla/5.0 (X11; Linux x86_64; rv:129.0) Gecko/20100101 Firefox/129.0",
  safari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  unknown: "curl/8.4.0",
};

function stubUserAgent(value: string) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(value);
}

describe("getBrowserInfo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ["edge", "Edge 128"],
    ["chrome", "Chrome 127"],
    ["firefox", "Firefox 129"],
    ["safari", "Safari 17"],
    ["unknown", "Unknown Unknown"],
  ] as const)("identifies the %s user agent", (key, expected) => {
    stubUserAgent(userAgents[key]);

    expect(getBrowserInfo().browser).toBe(expected);
  });

  it("reports the raw user agent and environment details", () => {
    stubUserAgent(userAgents.chrome);

    const info = getBrowserInfo();

    expect(info.userAgent).toBe(userAgents.chrome);
    expect(info.screenResolution).toMatch(/^\d+x\d+$/);
    expect(info.viewportSize).toMatch(/^\d+x\d+$/);
    expect(info.localStorage).toBe(true);
    expect(typeof info.cookiesEnabled).toBe("boolean");
  });
});
