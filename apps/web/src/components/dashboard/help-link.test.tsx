import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import HelpLink from "./help-link";

// There is no router in this test; Link renders as a plain anchor
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));

describe("HelpLink", () => {
  it("links the explanation prompt to the math page", () => {
    render(<HelpLink />);

    const link = screen.getByRole("link", { name: "What is all this?" });
    expect(link).toHaveAttribute("href", "/math");
  });
});
