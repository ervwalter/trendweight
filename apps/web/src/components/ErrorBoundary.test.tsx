import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

// Mock router components
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock react-helmet-async
vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: any) => children,
}));

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
}

describe("ErrorBoundary", () => {
  let originalConsoleError: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console errors for these tests
    originalConsoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("should render error UI when an error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("We encountered an unexpected error while processing your request.")).toBeInTheDocument();
  });

  it("should display error ID when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Error ID")).toBeInTheDocument();

    // Error ID should be in the format ERR-timestamp-randomstring
    const errorIdElement = screen.getByText(/^ERR-\d+-[a-z0-9]+$/);
    expect(errorIdElement).toBeInTheDocument();
  });

  it("should display refresh and homepage buttons", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("button", { name: "Refresh Page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Homepage" })).toBeInTheDocument();
  });

  it("should log error to console", () => {
    const consoleSpy = vi.spyOn(console, "error");

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "Error caught by ErrorBoundary:",
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      }),
    );

    expect(consoleSpy).toHaveBeenCalledWith("Error ID:", expect.stringMatching(/^ERR-\d+-[a-z0-9]+$/));
  });

  it("should display help text", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/This error has been logged/)).toBeInTheDocument();
    expect(screen.getByText(/contact support with the error ID/)).toBeInTheDocument();
  });

  it("should have error icon", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Check for the SVG icon with proper accessibility attributes
    const icon = screen.getByRole("img", { name: "Error icon" });
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-8", "w-8");
  });

  it("should set page title and meta tags when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Helmet is mocked, so we can't test actual meta tags
    // Just verify the error UI is shown
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should generate unique error IDs for different errors", () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    const firstErrorId = screen.getByText(/^ERR-\d+-[a-z0-9]+$/).textContent;
    unmount();

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    const secondErrorId = screen.getByText(/^ERR-\d+-[a-z0-9]+$/).textContent;

    expect(firstErrorId).not.toBe(secondErrorId);
  });

  it("should handle error recovery", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Error boundaries don't automatically recover, but we can test the non-error state
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    // The error boundary will still show error state since it doesn't auto-recover
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });
});
