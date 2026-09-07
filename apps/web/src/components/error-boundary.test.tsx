import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./error-boundary";

function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // React reports the caught error on console.error; keep the test output quiet
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children while nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("replaces the tree with the error page, including the thrown message", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText("We encountered an unexpected error while processing your request.")).toBeInTheDocument();
    expect(screen.getByText("Error Details")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
    expect(screen.getByText(/Try refreshing the page first/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "error icon" })).toHaveAttribute("src", "/error.svg");
  });

  it("offers a refresh, a way home and a prefilled support email", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: "Refresh Page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Homepage" })).toHaveAttribute("href", "/");

    const href = screen.getByRole("link", { name: "Email Support" }).getAttribute("href") ?? "";
    expect(href).toMatch(/^mailto:erv@ewal\.net\?subject=TrendWeight%20Error%20Report&body=/);
    const body = decodeURIComponent(href.slice(href.indexOf("&body=") + "&body=".length));
    expect(body).toContain("- Error Message: Test error");
  });

  it("logs the caught error", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith("Error caught by ErrorBoundary:", expect.objectContaining({ message: "Test error" }), expect.anything());
  });

  it("sets the page title and blocks indexing", async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    await waitFor(() => {
      expect(document.title).toBe("Something went wrong - TrendWeight");
    });
    expect(document.head.innerHTML).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it("stays on the error page after the children stop throwing", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.queryByText("No error")).not.toBeInTheDocument();
  });
});
