import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    execArgv: ["--no-experimental-webstorage"],
    environmentOptions: {
      jsdom: {
        url: "http://localhost",
      },
    },
    setupFiles: "./src/test/setup.ts",
    // Tests never talk to Supabase Realtime. Pin the client env to empty so a developer
    // shell that exports VITE_SUPABASE_* cannot make SyncProgressProvider open a real
    // WebSocket mid-run; client.test.ts stubs these per test where it needs them.
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
    },
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json", "html"],
      reportsDirectory: "./coverage",
      // Measure every source file, not only the ones a test happens to import,
      // so untested modules show up as 0% instead of being invisible. Reporting
      // only: there are deliberately no thresholds.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/test/**", "src/**/*.test.{ts,tsx}", "**/*.d.ts", "**/mockData/**", "src/main.tsx", "src/routes/__root.tsx", "src/routeTree.gen.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
