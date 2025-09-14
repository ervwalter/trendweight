import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmbedLayout } from "./embed-layout";

// Mock the hooks
vi.mock("@/lib/hooks/use-embed-params", () => ({
  useEmbedParams: vi.fn(),
}));

// Mock page title utility
vi.mock("@/lib/utils/page-title", () => ({
  pageTitle: vi.fn((title) => (title ? `${title} - TrendWeight` : "TrendWeight")),
}));

const mockUseEmbedParams = vi.mocked(await import("@/lib/hooks/use-embed-params")).useEmbedParams;

describe("EmbedLayout", () => {
  beforeEach(() => {
    // Reset document.documentElement.classList
    document.documentElement.className = "";
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.documentElement.className = "";
  });

  it("renders children correctly", () => {
    mockUseEmbedParams.mockReturnValue({});

    render(
      <EmbedLayout>
        <div data-testid="test-content">Test Content</div>
      </EmbedLayout>,
    );

    expect(screen.getByTestId("test-content")).toBeInTheDocument();
  });

  it("applies dark mode when dark parameter is true", () => {
    mockUseEmbedParams.mockReturnValue({ dark: true });

    render(
      <EmbedLayout>
        <div>Content</div>
      </EmbedLayout>,
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark mode when dark parameter is false", () => {
    // Start with dark mode
    document.documentElement.classList.add("dark");
    mockUseEmbedParams.mockReturnValue({ dark: false });

    render(
      <EmbedLayout>
        <div>Content</div>
      </EmbedLayout>,
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("does not modify dark mode when dark parameter is undefined", () => {
    // Start with dark mode
    document.documentElement.classList.add("dark");
    mockUseEmbedParams.mockReturnValue({ dark: undefined });

    render(
      <EmbedLayout>
        <div>Content</div>
      </EmbedLayout>,
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applies max-width style when width parameter is provided", () => {
    mockUseEmbedParams.mockReturnValue({ width: 800 });

    render(
      <EmbedLayout>
        <div>Content</div>
      </EmbedLayout>,
    );

    const container = document.querySelector(".min-h-screen");
    expect(container).toHaveStyle({ maxWidth: "800px" });
  });

  it("does not apply max-width style when width parameter is not provided", () => {
    mockUseEmbedParams.mockReturnValue({});

    render(
      <EmbedLayout>
        <div>Content</div>
      </EmbedLayout>,
    );

    const container = document.querySelector(".min-h-screen");
    // In jsdom v27, undefined style attributes are handled differently
    // Check that maxWidth is either empty string or not set
    const style = container ? window.getComputedStyle(container) : null;
    expect(style?.maxWidth).toMatch(/^(none|)$/);
  });

  it("renders title correctly", () => {
    mockUseEmbedParams.mockReturnValue({});

    render(
      <EmbedLayout title="Test Page">
        <div>Content</div>
      </EmbedLayout>,
    );

    expect(document.title).toBe("Test Page - TrendWeight");
  });

  it("renders default title when no title provided", () => {
    mockUseEmbedParams.mockReturnValue({});

    render(
      <EmbedLayout>
        <div>Content</div>
      </EmbedLayout>,
    );

    expect(document.title).toBe("TrendWeight");
  });

  it("renders noindex meta tag when noIndex is true", () => {
    mockUseEmbedParams.mockReturnValue({});

    render(
      <EmbedLayout noIndex>
        <div>Content</div>
      </EmbedLayout>,
    );

    const metaTag = document.querySelector('meta[name="robots"]');
    expect(metaTag).toHaveAttribute("content", "noindex, nofollow");
  });

  it("does not render noindex meta tag when noIndex is false", () => {
    mockUseEmbedParams.mockReturnValue({});

    render(
      <EmbedLayout noIndex={false}>
        <div>Content</div>
      </EmbedLayout>,
    );

    const metaTag = document.querySelector('meta[name="robots"]');
    expect(metaTag).not.toBeInTheDocument();
  });

  it("renders custom suspense fallback", () => {
    mockUseEmbedParams.mockReturnValue({});
    const customFallback = <div data-testid="custom-loading">Custom Loading</div>;

    render(
      <EmbedLayout suspenseFallback={customFallback}>
        <div>Content</div>
      </EmbedLayout>,
    );

    // The content should be rendered immediately since it's not actually suspended
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders default loading fallback when no custom fallback provided", () => {
    mockUseEmbedParams.mockReturnValue({});

    render(
      <EmbedLayout>
        <div>Content</div>
      </EmbedLayout>,
    );

    // The content should be rendered immediately since it's not actually suspended
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("handles multiple search parameters together", () => {
    mockUseEmbedParams.mockReturnValue({
      dark: true,
      width: 1200,
    });

    render(
      <EmbedLayout title="Multi Param Test">
        <div>Content</div>
      </EmbedLayout>,
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    const container = document.querySelector(".min-h-screen");
    expect(container).toHaveStyle({ maxWidth: "1200px" });

    expect(document.title).toBe("Multi Param Test - TrendWeight");
  });
});
