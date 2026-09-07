import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExternalLink } from "./external-link";

describe("ExternalLink", () => {
  it("renders the link text", () => {
    render(<ExternalLink href="https://example.com">Example Link</ExternalLink>);

    expect(screen.getByRole("link", { name: /example link/i })).toBeInTheDocument();
  });

  it("opens the href in a new tab with security attributes", () => {
    render(<ExternalLink href="https://example.com/page">Test Link</ExternalLink>);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com/page");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
