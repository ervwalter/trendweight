import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeToggle } from "./mode-toggle";
import { ThemeProvider } from "./theme-provider";

describe("ModeToggle", () => {
  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider>{component}</ThemeProvider>);
  };

  it("renders mode toggle button", () => {
    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it("shows sun icon when theme is light", () => {
    localStorage.setItem("trendweight-theme", "light");

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button.querySelector('[data-testid="sun-icon"]')).toBeInTheDocument();
  });

  it("shows moon icon when theme is dark", () => {
    localStorage.setItem("trendweight-theme", "dark");

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button.querySelector('[data-testid="moon-icon"]')).toBeInTheDocument();
  });

  it("shows sun or moon icon based on system preference when theme is system", () => {
    localStorage.setItem("trendweight-theme", "system");

    // Mock system preference as light
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

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    // Should show sun icon when system is light
    expect(button.querySelector('[data-testid="sun-icon"]')).toBeInTheDocument();
  });

  it("opens dropdown menu when clicked", async () => {
    const user = userEvent.setup();

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /light/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /dark/i })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /system/i })).toBeInTheDocument();
    });
  });

  it("changes theme to light when Light option is selected", async () => {
    const user = userEvent.setup();
    localStorage.setItem("trendweight-theme", "dark");

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(button);

    const lightOption = await screen.findByRole("menuitem", { name: /light/i });
    await user.click(lightOption);

    await waitFor(() => {
      expect(localStorage.getItem("trendweight-theme")).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  it("changes theme to dark when Dark option is selected", async () => {
    const user = userEvent.setup();
    localStorage.setItem("trendweight-theme", "light");

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(button);

    const darkOption = await screen.findByRole("menuitem", { name: /dark/i });
    await user.click(darkOption);

    await waitFor(() => {
      expect(localStorage.getItem("trendweight-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("changes theme to system when System option is selected", async () => {
    const user = userEvent.setup();
    localStorage.setItem("trendweight-theme", "light");

    // Mock system preference as dark
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

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(button);

    const systemOption = await screen.findByRole("menuitem", { name: /system/i });
    await user.click(systemOption);

    await waitFor(() => {
      expect(localStorage.getItem("trendweight-theme")).toBe("system");
      // Should apply system preference (dark in this case)
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("closes dropdown after selection", async () => {
    const user = userEvent.setup();

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(button);

    const lightOption = await screen.findByRole("menuitem", { name: /light/i });
    await user.click(lightOption);

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: /light/i })).not.toBeInTheDocument();
    });
  });

  it("supports keyboard navigation", async () => {
    const user = userEvent.setup();

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });

    // Focus the button and open with Enter key
    button.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByRole("menuitem", { name: /light/i })).toBeInTheDocument();
    });

    // Navigate with arrow keys
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: /light/i })).not.toBeInTheDocument();
    });
  });

  it("closes dropdown when Escape is pressed", async () => {
    const user = userEvent.setup();

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    await user.click(button);

    await screen.findByRole("menuitem", { name: /light/i });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: /light/i })).not.toBeInTheDocument();
    });
  });

  it("has proper accessibility attributes", () => {
    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button).toHaveAttribute("aria-label", "Toggle theme");
    expect(button).toHaveAttribute("aria-haspopup", "menu");
  });
});
