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
