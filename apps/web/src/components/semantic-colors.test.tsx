import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";

// Helper to check if an element uses semantic color classes
function usesSemantic(element: HTMLElement): boolean {
  const classList = element.className;

  // List of non-semantic color classes that should not be used
  const nonSemanticPatterns = [
    /\bbg-background\b/,
    /\bbg-gray-\d+\b/,
    /\bbg-slate-\d+\b/,
    /\bbg-zinc-\d+\b/,
    /\bbg-neutral-\d+\b/,
    /\bbg-stone-\d+\b/,
    /\btext-gray-\d+\b/,
    /\btext-slate-\d+\b/,
    /\btext-zinc-\d+\b/,
    /\btext-neutral-\d+\b/,
    /\btext-stone-\d+\b/,
    /\btext-foreground\b/,
    /\btext-white\b/,
    /\bborder-gray-\d+\b/,
    /\bborder-slate-\d+\b/,
    /\bborder-zinc-\d+\b/,
    /\bborder-neutral-\d+\b/,
    /\bborder-stone-\d+\b/,
  ];

  // Check if any non-semantic patterns are found
  const hasNonSemantic = nonSemanticPatterns.some((pattern) => pattern.test(classList));

  // For an element to use semantic colors properly:
  // It should NOT have non-semantic color classes
  return !hasNonSemantic;
}

// Test component that demonstrates proper semantic color usage
function SemanticCard() {
  return (
    <div className="bg-card text-card-foreground border-border rounded-lg border p-4">
      <h2 className="text-foreground text-lg font-semibold">Card Title</h2>
      <p className="text-muted-foreground">Card description text</p>
      <div className="bg-muted mt-2 rounded p-2">
        <span className="text-muted-foreground">Muted content</span>
      </div>
    </div>
  );
}

// Test component that demonstrates incorrect non-semantic color usage
function NonSemanticCard() {
  return (
    <div className="bg-background text-foreground border-border rounded-lg border p-4">
      <h2 className="text-foreground text-lg font-semibold">Card Title</h2>
      <p className="text-muted-foreground">Card description text</p>
      <div className="bg-muted mt-2 rounded p-2">
        <span className="text-muted-foreground">Muted content</span>
      </div>
    </div>
  );
}

describe("Semantic Color System", () => {
  describe("Color Class Usage", () => {
    it("should use semantic color classes instead of hardcoded colors", () => {
      const { container } = render(
        <ThemeProvider defaultTheme="light">
          <SemanticCard />
        </ThemeProvider>,
      );

      const card = container.querySelector(".bg-card");
      expect(card).toBeTruthy();
      expect(usesSemantic(card as HTMLElement)).toBe(true);
    });

    it("should detect and fail when non-semantic colors are used", () => {
      const { container } = render(
        <ThemeProvider defaultTheme="light">
          <NonSemanticCard />
        </ThemeProvider>,
      );

      const card = container.querySelector(".bg-background");
      expect(card).toBeTruthy();
      expect(usesSemantic(card as HTMLElement)).toBe(false);
    });
  });

  describe("Theme Switching", () => {
    let originalMatchMedia: typeof window.matchMedia;

    beforeEach(() => {
      originalMatchMedia = window.matchMedia;

      // Mock matchMedia for theme tests
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      // Clear localStorage before each test
      localStorage.clear();
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      localStorage.clear();
      document.documentElement.classList.remove("dark");
    });

    it("should apply dark class to root when theme is dark", async () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <SemanticCard />
        </ThemeProvider>,
      );

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should remove dark class when theme is light", async () => {
      render(
        <ThemeProvider defaultTheme="light">
          <SemanticCard />
        </ThemeProvider>,
      );

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should persist theme preference to localStorage", async () => {
      render(
        <ThemeProvider defaultTheme="dark">
          <SemanticCard />
        </ThemeProvider>,
      );

      expect(localStorage.getItem("trendweight-theme")).toBe("dark");
    });
  });

  describe("Component Color Adaptation", () => {
    it("should use appropriate semantic classes for different component types", () => {
      function TestComponents() {
        return (
          <div>
            <button className="bg-primary text-primary-foreground">Primary Button</button>
            <button className="bg-secondary text-secondary-foreground">Secondary Button</button>
            <button className="bg-destructive text-destructive-foreground">Destructive Button</button>
            <div className="bg-muted text-muted-foreground">Muted Section</div>
            <div className="bg-accent text-accent-foreground">Accent Section</div>
          </div>
        );
      }

      const { container } = render(
        <ThemeProvider defaultTheme="light">
          <TestComponents />
        </ThemeProvider>,
      );

      // Check each element uses semantic classes
      const primaryBtn = container.querySelector(".bg-primary");
      expect(primaryBtn).toBeTruthy();
      expect(usesSemantic(primaryBtn as HTMLElement)).toBe(true);

      const secondaryBtn = container.querySelector(".bg-secondary");
      expect(secondaryBtn).toBeTruthy();
      expect(usesSemantic(secondaryBtn as HTMLElement)).toBe(true);

      const destructiveBtn = container.querySelector(".bg-destructive");
      expect(destructiveBtn).toBeTruthy();
      expect(usesSemantic(destructiveBtn as HTMLElement)).toBe(true);

      const mutedSection = container.querySelector(".bg-muted");
      expect(mutedSection).toBeTruthy();
      expect(usesSemantic(mutedSection as HTMLElement)).toBe(true);

      const accentSection = container.querySelector(".bg-accent");
      expect(accentSection).toBeTruthy();
      expect(usesSemantic(accentSection as HTMLElement)).toBe(true);
    });
  });

  describe("Border Semantic Colors", () => {
    it("should use border-border instead of border-gray-*", () => {
      function TestBorders() {
        return (
          <div>
            <div className="border-border border">Correct Border</div>
            <input className="border-input border" />
          </div>
        );
      }

      const { container } = render(
        <ThemeProvider defaultTheme="light">
          <TestBorders />
        </ThemeProvider>,
      );

      const borderDiv = container.querySelector(".border-border");
      expect(borderDiv).toBeTruthy();
      expect(usesSemantic(borderDiv as HTMLElement)).toBe(true);

      const inputBorder = container.querySelector(".border-input");
      expect(inputBorder).toBeTruthy();
      expect(usesSemantic(inputBorder as HTMLElement)).toBe(true);
    });

    it("should detect incorrect border colors", () => {
      function TestIncorrectBorders() {
        return (
          <div>
            <div className="border-border border">Incorrect Border</div>
            <input className="border-border border" />
          </div>
        );
      }

      const { container } = render(
        <ThemeProvider defaultTheme="light">
          <TestIncorrectBorders />
        </ThemeProvider>,
      );

      const grayBorder = container.querySelector(".border-border");
      expect(grayBorder).toBeTruthy();
      expect(usesSemantic(grayBorder as HTMLElement)).toBe(false);

      const slateBorder = container.querySelector(".border-border");
      expect(slateBorder).toBeTruthy();
      expect(usesSemantic(slateBorder as HTMLElement)).toBe(false);
    });
  });
});
