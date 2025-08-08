import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Heading } from "./heading";

describe("Heading", () => {
  it("should render h1 element for level 1", () => {
    render(<Heading level={1}>Test Heading</Heading>);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Test Heading");
  });

  it("should render h2 element for level 2", () => {
    render(<Heading level={2}>Test Heading</Heading>);

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("Test Heading");
  });

  it("should render all heading levels correctly", () => {
    const { rerender } = render(<Heading level={1}>Test</Heading>);

    for (let level = 1; level <= 6; level++) {
      rerender(<Heading level={level as 1 | 2 | 3 | 4 | 5 | 6}>Test H{level}</Heading>);
      const heading = screen.getByRole("heading", { level });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent(`Test H${level}`);
    }
  });

  it("should apply display font for h1 when display prop is true", () => {
    render(
      <Heading level={1} display>
        Display Heading
      </Heading>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("font-display");
  });

  it("should not apply display font when display prop is false", () => {
    render(
      <Heading level={1} display={false}>
        Regular Heading
      </Heading>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).not.toHaveClass("font-display");
  });

  it("should merge custom className with base styles", () => {
    render(
      <Heading level={1} className="custom-class">
        Test
      </Heading>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("custom-class");
    expect(heading).toHaveClass("text-2xl");
    expect(heading).toHaveClass("font-bold");
  });

  it("should apply different base styles for different levels", () => {
    render(<Heading level={1}>H1</Heading>);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveClass("text-2xl", "font-bold");

    render(<Heading level={2}>H2</Heading>);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toHaveClass("text-xl", "font-semibold");

    render(<Heading level={3}>H3</Heading>);
    const h3 = screen.getByRole("heading", { level: 3 });
    expect(h3).toHaveClass("text-lg", "font-semibold");
  });

  it("should pass through HTML props", () => {
    render(
      <Heading level={1} id="test-id" aria-label="Custom label">
        Test
      </Heading>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAttribute("id", "test-id");
    expect(heading).toHaveAttribute("aria-label", "Custom label");
  });
});
