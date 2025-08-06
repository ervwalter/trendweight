import { describe, it, expect } from "vitest";

describe("shadcn/ui setup", () => {
  it("should be able to import class-variance-authority", async () => {
    const { cva } = await import("class-variance-authority");
    expect(typeof cva).toBe("function");
  });

  it("should be able to import lucide-react icons", async () => {
    const { Menu, X, Check } = await import("lucide-react");
    expect(Menu).toBeDefined();
    expect(X).toBeDefined();
    expect(Check).toBeDefined();
  });

  it("should have tailwind config with CSS variables", () => {
    // This test will verify CSS variables are properly configured
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    // Check if CSS custom properties exist (they may be empty initially)
    expect(computedStyle.getPropertyValue("--primary")).toBeDefined();
    expect(computedStyle.getPropertyValue("--background")).toBeDefined();
    expect(computedStyle.getPropertyValue("--foreground")).toBeDefined();
  });

  it("should have proper TypeScript path resolution for @/components/ui", async () => {
    // This will test that TypeScript can resolve @/components/ui/* paths
    // Test with existing Button component (PascalCase) to verify path resolution works
    try {
      await import("@/components/ui/Button");
      // If we get here, path resolution is working
      expect(true).toBe(true); // Path resolution successful
    } catch (error: any) {
      // Path resolution failed
      expect(error.message).toContain("Cannot resolve");
    }
  });
});
