import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Login } from "./Login";

// Mock Clerk components
vi.mock("@clerk/clerk-react", () => ({
  SignIn: ({ routing }: any) => <div data-testid="clerk-signin">SignIn Component (routing: {routing})</div>,
}));

// Mock dependencies
vi.mock("../notices/NewVersionNotice", () => ({
  NewVersionNotice: () => <div data-testid="new-version-notice">New Version Notice</div>,
}));

vi.mock("./PrivacyPolicyLink", () => ({
  PrivacyPolicyLink: () => <div data-testid="privacy-policy-link">Privacy Policy Link</div>,
}));

describe("Login", () => {
  it("should render all login components", () => {
    render(<Login />);

    expect(screen.getByTestId("new-version-notice")).toBeInTheDocument();
    expect(screen.getByTestId("clerk-signin")).toBeInTheDocument();
    expect(screen.getByTestId("clerk-signin")).toHaveTextContent("routing: hash");
    expect(screen.getByTestId("privacy-policy-link")).toBeInTheDocument();
  });
});
