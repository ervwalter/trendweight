import { Component } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Container } from "./Container";
import { pageTitle } from "../lib/utils/pageTitle";
import { Button } from "./ui/Button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    const errorId = `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, errorId };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    console.error("Error ID:", this.state.errorId);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <title>{pageTitle("Something went wrong")}</title>
          <meta name="robots" content="noindex, nofollow" />

          <Container>
            <div className="flex min-h-[67vh] flex-col items-center justify-center p-4">
              <div className="w-full max-w-md text-center">
                <div className="mb-8">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-semibold text-gray-900">Something went wrong</h1>
                </div>

                <div className="space-y-4 text-gray-600">
                  <p>We encountered an unexpected error while processing your request.</p>

                  {this.state.errorId && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-700">Error ID</p>
                      <p className="font-mono text-xs text-gray-600">{this.state.errorId}</p>
                    </div>
                  )}

                  <p className="text-sm">
                    This error has been logged. If the problem persists, please try refreshing the page or contact support with the error ID above.
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button onClick={() => window.location.reload()} variant="secondary">
                    Refresh Page
                  </Button>
                  <Button asChild>
                    <Link to="/">Go to Homepage</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Container>
        </>
      );
    }

    return this.props.children;
  }
}
