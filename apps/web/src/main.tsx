import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// @ts-expect-error - no types available
import "@fontsource-variable/inter";
// Only import Latin subset for Zilla Slab (used only for "TrendWeight" logo)
import "@fontsource/zilla-slab/latin-400.css";
import "@fontsource/zilla-slab/latin-700.css";
import "./index.css";
import App from "./app.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
