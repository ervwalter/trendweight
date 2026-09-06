import { useEffect, useState } from "react";
import { ThemeProviderContext, type Theme } from "@/lib/contexts/theme-context";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

export function ThemeProvider({ children, defaultTheme = "light", storageKey = "trendweight-theme", ...props }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "light" || stored === "dark") return stored;
      window.localStorage.setItem(storageKey, defaultTheme);
    } catch {
      // Storage may be blocked in embedded pages or by browser privacy settings.
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        // Validate the new value is either "light" or "dark"
        if (e.newValue === "light" || e.newValue === "dark") {
          setTheme(e.newValue);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, [storageKey]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      try {
        window.localStorage.setItem(storageKey, theme);
      } catch {
        // The theme still works for this page when persistence is unavailable.
      }
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
