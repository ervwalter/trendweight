import { useContext } from "react";
import { ThemeProviderContext } from "@/lib/contexts/theme-context";

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  // Check if context is the default (not wrapped in provider)
  // The initial state's setTheme returns null
  if (context.setTheme.toString().includes("() => null")) throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
