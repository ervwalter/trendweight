export interface SystemInfo {
  browser: string;
  userAgent: string;
  platform: string;
  language: string;
  screenResolution: string;
  viewportSize: string;
  cookiesEnabled: boolean;
  localStorage: boolean;
}

export function getBrowserInfo(): SystemInfo {
  const ua = navigator.userAgent;
  const browser = {
    name: "Unknown",
    version: "Unknown",
  };

  // Chromium Edge identifies as "Edg/" and also carries a "Chrome/" token, so it must be checked first
  if (ua.includes("Edg/")) {
    browser.name = "Edge";
    browser.version = ua.match(/Edg\/(\d+)/)?.[1] || "Unknown";
  } else if (ua.includes("Chrome")) {
    browser.name = "Chrome";
    browser.version = ua.match(/Chrome\/(\d+)/)?.[1] || "Unknown";
  } else if (ua.includes("Firefox")) {
    browser.name = "Firefox";
    browser.version = ua.match(/Firefox\/(\d+)/)?.[1] || "Unknown";
  } else if (ua.includes("Safari")) {
    browser.name = "Safari";
    browser.version = ua.match(/Version\/(\d+)/)?.[1] || "Unknown";
  }

  return {
    browser: `${browser.name} ${browser.version}`,
    userAgent: ua,
    platform:
      (navigator as unknown as { platform?: string }).platform ||
      (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ||
      "Unknown",
    language: navigator.language || "Unknown",
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    cookiesEnabled: navigator.cookieEnabled,
    localStorage: (() => {
      try {
        return !!window.localStorage;
      } catch {
        return false;
      }
    })(),
  };
}
