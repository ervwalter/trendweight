import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "./theme-provider";
import { useTheme } from "@/lib/hooks/use-theme";

// Test component to access theme context
function TestComponent() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    document.documentElement.className = "";
  });

  it("provides theme context to children", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("current-theme")).toBeInTheDocument();
  });

  it("defaults to light theme when no stored preference", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
  });

  it("uses stored theme preference from localStorage", () => {
    localStorage.setItem("trendweight-theme", "dark");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
  });

  it("applies dark class to document root when theme is dark", async () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("removes dark class from document root when theme is light", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("updates theme when setTheme is called", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    // Start with light (default)
    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");

    // Switch to dark
    const setDarkButton = screen.getByText("Set Dark");
    await user.click(setDarkButton);

    await waitFor(() => {
      expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    // Switch back to light
    const setLightButton = screen.getByText("Set Light");
    await user.click(setLightButton);

    await waitFor(() => {
      expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  it("persists theme to localStorage when changed", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const setDarkButton = screen.getByText("Set Dark");
    await user.click(setDarkButton);

    await waitFor(() => {
      expect(localStorage.getItem("trendweight-theme")).toBe("dark");
    });
  });

  it("allows overriding default theme", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
  });

  it("uses custom storage key when provided", async () => {
    const user = userEvent.setup();
    const customKey = "custom-theme-key";

    render(
      <ThemeProvider storageKey={customKey}>
        <TestComponent />
      </ThemeProvider>,
    );

    const setDarkButton = screen.getByText("Set Dark");
    await user.click(setDarkButton);

    await waitFor(() => {
      expect(localStorage.getItem(customKey)).toBe("dark");
      expect(localStorage.getItem("trendweight-theme")).toBeNull();
    });
  });

  it("syncs theme across tabs via storage event", () => {
    const { rerender } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    // Simulate storage event from another tab
    const storageEvent = new StorageEvent("storage", {
      key: "trendweight-theme",
      newValue: "dark",
      oldValue: "light",
      storageArea: localStorage,
    });

    window.dispatchEvent(storageEvent);

    rerender(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    waitFor(() => {
      expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    });
  });

  it("ignores invalid theme values from localStorage", () => {
    localStorage.setItem("trendweight-theme", "invalid-theme");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    // Should default to light when invalid
    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
  });

  it("ignores invalid theme values from storage events", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    // Simulate storage event with invalid value
    const storageEvent = new StorageEvent("storage", {
      key: "trendweight-theme",
      newValue: "invalid-theme",
      oldValue: "light",
      storageArea: localStorage,
    });

    window.dispatchEvent(storageEvent);

    // Should remain light
    expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
  });
});
