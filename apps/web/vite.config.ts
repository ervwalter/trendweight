import tailwindcss from "@tailwindcss/vite";
import tanstackRouter from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
  },
  server: {
    host: true,
    allowedHosts: ["studio-1", "studio-1.elf-hadar.ts.net", ".local"],
    proxy: {
      // Proxy all /api requests to the C# backend
      "/api": {
        target: "http://localhost:5199",
        changeOrigin: true,
        secure: false,
      },
      // Proxy Plausible Analytics script requests
      "/js": {
        target: "http://localhost:5199",
        changeOrigin: true,
        secure: false,
      },
      // Proxy API docs. Their server URL uses the backend PublicBaseUrl setting.
      "/api-docs": {
        target: "http://localhost:5199",
        changeOrigin: true,
        secure: false,
      },
      "/openapi": {
        target: "http://localhost:5199",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
