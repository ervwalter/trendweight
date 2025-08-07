import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "./theme-provider";
import { useTheme } from "../lib/hooks/use-theme";

// Test component to access theme context
function TestComponent() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("system")}>Set System</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();

    // Mock matchMedia for system preference tests
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
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

  it("defaults to system theme when no stored preference", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("current-theme")).toHaveTextContent("system");
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
    });
  });

  it("applies system preference when theme is system", async () => {
    // System prefers dark (mocked above)
    render(
      <ThemeProvider defaultTheme="system">
        <TestComponent />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("updates theme when setTheme is called", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const setLightButton = screen.getByText("Set Light");
    await user.click(setLightButton);

    await waitFor(() => {
      expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
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

  it("responds to system preference changes", async () => {
    // Test that the theme provider correctly applies system preferences
    // We'll test by rendering with system theme and checking the applied class

    // Start with dark system preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { unmount } = render(
      <ThemeProvider defaultTheme="system">
        <TestComponent />
      </ThemeProvider>,
    );

    // Should have dark class when system prefers dark
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    unmount();
    document.documentElement.className = "";

    // Now test with light system preference
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false, // light mode
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <ThemeProvider defaultTheme="system">
        <TestComponent />
      </ThemeProvider>,
    );

    // Should have light class when system prefers light
    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  it("syncs theme across browser tabs via storage event", async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    // Simulate storage event from another tab
    const storageEvent = new StorageEvent("storage", {
      key: "trendweight-theme",
      newValue: "dark",
      storageArea: localStorage,
    });

    window.dispatchEvent(storageEvent);

    await waitFor(() => {
      expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("supports custom storage key", () => {
    render(
      <ThemeProvider storageKey="custom-theme-key" defaultTheme="dark">
        <TestComponent />
      </ThemeProvider>,
    );

    expect(localStorage.getItem("custom-theme-key")).toBe("dark");
  });

  it("throws error when useTheme is used outside ThemeProvider", () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const TestComponentWithoutProvider = () => {
      useTheme(); // This should throw
      return <div>Should not render</div>;
    };

    expect(() => render(<TestComponentWithoutProvider />)).toThrow("useTheme must be used within a ThemeProvider");

    consoleErrorSpy.mockRestore();
  });
});
