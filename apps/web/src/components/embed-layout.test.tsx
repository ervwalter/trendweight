import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmbedParams } from "@/lib/hooks/use-embed-params";
import { EmbedLayout } from "./embed-layout";

// The embed params come from the sharing route's search params; there is no router here
vi.mock("@/lib/hooks/use-embed-params", () => ({ useEmbedParams: vi.fn() }));

const useEmbedParamsMock = vi.mocked(useEmbedParams);

// A component that suspends until resolve() is called
function createSuspender(text: string) {
  let settled = false;
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = () => {
      settled = true;
      r();
    };
  });
  const Suspender = () => {
    if (!settled) throw promise;
    return <div>{text}</div>;
  };
  return { Suspender, resolve };
}

describe("EmbedLayout", () => {
  beforeEach(() => {
    useEmbedParamsMock.mockReturnValue({});
    document.documentElement.className = "";
  });

  afterEach(() => {
    document.documentElement.className = "";
  });

  it("renders its children", () => {
    render(
      <EmbedLayout>
        <div>Test Content</div>
      </EmbedLayout>,
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  describe("dark mode", () => {
    it("adds the dark class when the dark parameter is true", () => {
      useEmbedParamsMock.mockReturnValue({ dark: true });

      render(
        <EmbedLayout>
          <div>Content</div>
        </EmbedLayout>,
      );

      expect(document.documentElement).toHaveClass("dark");
    });

    it("removes the dark class when the dark parameter is false", () => {
      document.documentElement.classList.add("dark");
      useEmbedParamsMock.mockReturnValue({ dark: false });

      render(
        <EmbedLayout>
          <div>Content</div>
        </EmbedLayout>,
      );

      expect(document.documentElement).not.toHaveClass("dark");
    });

    it("leaves the dark class alone when the dark parameter is absent", () => {
      document.documentElement.classList.add("dark");
      useEmbedParamsMock.mockReturnValue({ dark: undefined });

      render(
        <EmbedLayout>
          <div>Content</div>
        </EmbedLayout>,
      );

      expect(document.documentElement).toHaveClass("dark");
    });
  });

  describe("width", () => {
    it("caps the layout at the width parameter", () => {
      useEmbedParamsMock.mockReturnValue({ width: 800 });

      const { container } = render(
        <EmbedLayout>
          <div>Content</div>
        </EmbedLayout>,
      );

      expect(container).toContainHTML('style="max-width: 800px;"');
    });

    it("applies no cap without a width parameter", () => {
      const { container } = render(
        <EmbedLayout>
          <div>Content</div>
        </EmbedLayout>,
      );

      expect(container).not.toContainHTML("max-width");
    });
  });

  describe("document head", () => {
    it("sets the page title from the title prop", () => {
      render(
        <EmbedLayout title="Test Page">
          <div>Content</div>
        </EmbedLayout>,
      );

      expect(document.title).toBe("Test Page - TrendWeight");
    });

    it("falls back to the site name without a title", () => {
      render(
        <EmbedLayout>
          <div>Content</div>
        </EmbedLayout>,
      );

      expect(document.title).toBe("TrendWeight");
    });

    it("asks robots not to index when noIndex is set", () => {
      render(
        <EmbedLayout noIndex>
          <div>Content</div>
        </EmbedLayout>,
      );

      expect(document.head.innerHTML).toContain('<meta name="robots" content="noindex, nofollow">');
    });

    it("emits no robots directive by default", () => {
      render(
        <EmbedLayout>
          <div>Content</div>
        </EmbedLayout>,
      );

      expect(document.head.innerHTML).not.toContain('name="robots"');
    });
  });

  describe("suspense", () => {
    it("shows the custom fallback while a child suspends, then the child", async () => {
      const { Suspender, resolve } = createSuspender("Loaded content");

      render(
        <EmbedLayout suspenseFallback={<div>Custom Loading</div>}>
          <Suspender />
        </EmbedLayout>,
      );

      expect(screen.getByText("Custom Loading")).toBeInTheDocument();
      expect(screen.queryByText("Loaded content")).not.toBeInTheDocument();

      await act(async () => {
        resolve();
      });

      expect(await screen.findByText("Loaded content")).toBeInTheDocument();
      expect(screen.queryByText("Custom Loading")).not.toBeInTheDocument();
    });

    it("shows the built-in spinner while a child suspends when no fallback is given", async () => {
      const { Suspender, resolve } = createSuspender("Loaded content");

      const { container } = render(
        <EmbedLayout>
          <Suspender />
        </EmbedLayout>,
      );

      expect(screen.queryByText("Loaded content")).not.toBeInTheDocument();
      expect(container).toContainHTML("animate-spin");

      await act(async () => {
        resolve();
      });

      expect(await screen.findByText("Loaded content")).toBeInTheDocument();
      expect(container).not.toContainHTML("animate-spin");
    });
  });

  it("applies every parameter together", () => {
    useEmbedParamsMock.mockReturnValue({ dark: true, width: 1200 });

    const { container } = render(
      <EmbedLayout title="Multi Param Test">
        <div>Content</div>
      </EmbedLayout>,
    );

    expect(document.documentElement).toHaveClass("dark");
    expect(container).toContainHTML('style="max-width: 1200px;"');
    expect(document.title).toBe("Multi Param Test - TrendWeight");
  });
});
