import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HelpLink from "./help-link";

// Mock TanStack Router's Link component
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, className, children }: any) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("HelpLink", () => {
  it("renders the help link with correct text", () => {
    render(<HelpLink />);
    expect(screen.getByText("What is all this?")).toBeInTheDocument();
  });

  it("links to the math page", () => {
    render(<HelpLink />);
    const link = screen.getByRole("link", { name: /what is all this/i });
    expect(link).toHaveAttribute("href", "/math");
  });

  it("includes question mark icon", () => {
    const { container } = render(<HelpLink />);
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("h-5", "w-5");
  });

  it("has correct styling classes", () => {
    render(<HelpLink />);
    const link = screen.getByRole("link");
    expect(link).toHaveClass("inline-flex", "items-center", "gap-1", "text-muted-foreground", "italic", "transition-colors", "hover:text-foreground/80");
  });
});
