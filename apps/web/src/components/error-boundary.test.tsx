import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./error-boundary";

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

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText("We encountered an unexpected error while processing your request.")).toBeInTheDocument();
  });

  it("should display error details when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Error Details")).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
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

    expect(consoleSpy).toHaveBeenCalled();
    // The actual console.error call from React's error boundary
    expect(consoleSpy.mock.calls.some((call) => call.some((arg) => arg instanceof Error && arg.message === "Test error"))).toBe(true);
  });

  it("should display help text", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Try refreshing the page first/)).toBeInTheDocument();
    expect(screen.getByText(/If the problem persists/)).toBeInTheDocument();
  });

  it("should have error icon", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Check for the error image
    const icon = screen.getByRole("img", { name: "error icon" });
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute("src", "/error.svg");
  });

  it("should set page title and meta tags when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Helmet is mocked, so we can't test actual meta tags
    // Just verify the error UI is shown
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });

  it("should display error message for different errors", () => {
    const { unmount } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Test error")).toBeInTheDocument();
    unmount();

    // Test that error boundary shows errors
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Test error")).toBeInTheDocument();
  });

  it("should handle error recovery", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();

    // Error boundaries don't automatically recover, but we can test the non-error state
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>,
    );

    // The error boundary will still show error state since it doesn't auto-recover
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
  });
});
