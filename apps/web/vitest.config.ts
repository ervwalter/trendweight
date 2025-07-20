import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules",
        "src/test/setup.ts",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "src/routes/__root.tsx",
        "src/routeTree.gen.ts",
        "dist/**",
        "coverage/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
