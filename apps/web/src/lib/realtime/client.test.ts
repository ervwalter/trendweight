import { afterEach, describe, expect, it, vi } from "vitest";

describe("realtime client", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("degrades to a null client instead of throwing when the Supabase env vars are missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { supabase } = await import("./client");

    expect(supabase).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("creates a client when both env vars are present", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");

    const { supabase } = await import("./client");

    expect(supabase).not.toBeNull();
    expect(typeof supabase?.channel).toBe("function");
  });
});
