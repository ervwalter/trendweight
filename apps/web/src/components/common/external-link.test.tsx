import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExternalLink } from "./external-link";

describe("ExternalLink", () => {
  it("renders link with correct text", () => {
    render(<ExternalLink href="https://example.com">Example Link</ExternalLink>);
    expect(screen.getByRole("link", { name: /example link/i })).toBeInTheDocument();
  });

  it("opens in new tab with security attributes", () => {
    render(<ExternalLink href="https://example.com">Test Link</ExternalLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("has correct href attribute", () => {
    const url = "https://example.com/page";
    render(<ExternalLink href={url}>Link</ExternalLink>);
    expect(screen.getByRole("link")).toHaveAttribute("href", url);
  });

  it("applies custom className", () => {
    render(
      <ExternalLink href="https://example.com" className="custom-class">
        Link
      </ExternalLink>,
    );
    expect(screen.getByRole("link")).toHaveClass("custom-class");
  });

  it("maintains default link styling classes", () => {
    render(<ExternalLink href="https://example.com">Link</ExternalLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveClass("text-link");
    expect(link).toHaveClass("hover:text-link");
    expect(link).toHaveClass("underline");
  });

  it("renders external link icon", () => {
    const { container } = render(<ExternalLink href="https://example.com">Link</ExternalLink>);
    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass("ml-0.5", "inline-block", "h-3", "w-3", "align-baseline");
  });
});
