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

describe("Login", () => {
  it("should render all login components", () => {
    render(<Login />);

    expect(screen.getByTestId("new-version-notice")).toBeInTheDocument();
    expect(screen.getByTestId("clerk-signin")).toBeInTheDocument();
    expect(screen.getByTestId("clerk-signin")).toHaveTextContent("routing: hash");
  });
});
