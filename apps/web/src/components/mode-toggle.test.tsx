import { describe, it, expect } from "vitest";
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

  it("toggles from light to dark when clicked", async () => {
    const user = userEvent.setup();
    localStorage.setItem("trendweight-theme", "light");

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });

    // Initially shows sun icon for light mode
    expect(button.querySelector('[data-testid="sun-icon"]')).toBeInTheDocument();

    await user.click(button);

    await waitFor(() => {
      // After click, should show moon icon for dark mode
      expect(button.querySelector('[data-testid="moon-icon"]')).toBeInTheDocument();
      expect(localStorage.getItem("trendweight-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("toggles from dark to light when clicked", async () => {
    const user = userEvent.setup();
    localStorage.setItem("trendweight-theme", "dark");

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });

    // Initially shows moon icon for dark mode
    expect(button.querySelector('[data-testid="moon-icon"]')).toBeInTheDocument();

    await user.click(button);

    await waitFor(() => {
      // After click, should show sun icon for light mode
      expect(button.querySelector('[data-testid="sun-icon"]')).toBeInTheDocument();
      expect(localStorage.getItem("trendweight-theme")).toBe("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  it("supports keyboard activation", async () => {
    const user = userEvent.setup();
    localStorage.setItem("trendweight-theme", "light");

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });

    // Focus the button and activate with Enter key
    button.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(localStorage.getItem("trendweight-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("supports Space key activation", async () => {
    const user = userEvent.setup();
    localStorage.setItem("trendweight-theme", "light");

    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });

    // Focus the button and activate with Space key
    button.focus();
    await user.keyboard(" ");

    await waitFor(() => {
      expect(localStorage.getItem("trendweight-theme")).toBe("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("has proper accessibility attributes", () => {
    renderWithTheme(<ModeToggle />);

    const button = screen.getByRole("button", { name: /toggle theme/i });
    expect(button).toHaveAttribute("aria-label", "Toggle theme");
    // Note: No aria-haspopup since there's no dropdown menu anymore
  });

  it("includes screen reader text", () => {
    renderWithTheme(<ModeToggle />);

    expect(screen.getByText("Toggle theme", { selector: ".sr-only" })).toBeInTheDocument();
  });
});
