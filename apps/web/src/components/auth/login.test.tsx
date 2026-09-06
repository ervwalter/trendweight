import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Login } from "./login";

// Mock Clerk components
vi.mock("@clerk/react", () => ({
  SignIn: ({ routing, forceRedirectUrl, signUpForceRedirectUrl }: any) => (
    <div data-testid="clerk-signin" data-force-redirect={forceRedirectUrl} data-signup-force-redirect={signUpForceRedirectUrl}>
      SignIn Component (routing: {routing})
    </div>
  ),
}));

// Mock dependencies
vi.mock("@/components/notices/new-version-notice", () => ({
  NewVersionNotice: () => <div data-testid="new-version-notice">New Version Notice</div>,
}));

describe("Login", () => {
  it("should render all login components", () => {
    render(<Login />);

    expect(screen.getByTestId("new-version-notice")).toBeInTheDocument();
    expect(screen.getByTestId("clerk-signin")).toBeInTheDocument();
    expect(screen.getByTestId("clerk-signin")).toHaveTextContent("routing: hash");
  });

  it("leaves the redirect to Clerk's app-wide fallback when no deep link is given", () => {
    render(<Login />);

    const signIn = screen.getByTestId("clerk-signin");
    expect(signIn).not.toHaveAttribute("data-force-redirect");
    expect(signIn).not.toHaveAttribute("data-signup-force-redirect");
  });

  it("sends the user back to the page they were trying to reach after login or sign-up", () => {
    render(<Login redirectTo="/settings" />);

    const signIn = screen.getByTestId("clerk-signin");
    expect(signIn).toHaveAttribute("data-force-redirect", "/settings");
    expect(signIn).toHaveAttribute("data-signup-force-redirect", "/settings");
  });
});
