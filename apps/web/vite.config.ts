import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: ["studio-1", "studio-1.elf-hadar.ts.net", ".local", "localhost"],
    proxy: {
      // Proxy all /api requests to the C# backend
      "/api": {
        target: "http://localhost:5199",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            // Forward the original host and protocol
            const host = req.headers.host;
            if (host) {
              proxyReq.setHeader("X-Forwarded-Host", host);
            }
            const socket = req.socket as { encrypted?: boolean };
            proxyReq.setHeader("X-Forwarded-Proto", socket.encrypted ? "https" : "http");
          });
        },
      },
    },
  },
});
