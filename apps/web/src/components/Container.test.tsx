import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Container } from "./Container";

describe("Container", () => {
  it("should render children content", () => {
    render(
      <Container>
        <p>Test content</p>
      </Container>,
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("should render as div by default", () => {
    const { container } = render(
      <Container>
        <p>Content</p>
      </Container>,
    );

    expect(container.firstChild?.nodeName).toBe("DIV");
  });

  it("should render as custom element when 'as' prop is provided", () => {
    const { container } = render(
      <Container as="section">
        <p>Content</p>
      </Container>,
    );

    expect(container.firstChild?.nodeName).toBe("SECTION");
  });

  it("should apply default responsive container classes", () => {
    const { container } = render(
      <Container>
        <p>Content</p>
      </Container>,
    );

    const containerElement = container.firstChild;
    expect(containerElement).toHaveClass("mx-auto");
    expect(containerElement).toHaveClass("w-full");
    expect(containerElement).toHaveClass("px-4");
    expect(containerElement).toHaveClass("sm:max-w-[640px]");
    expect(containerElement).toHaveClass("sm:px-4");
    expect(containerElement).toHaveClass("md:max-w-[768px]");
    expect(containerElement).toHaveClass("md:px-4");
    expect(containerElement).toHaveClass("lg:max-w-[1024px]");
    expect(containerElement).toHaveClass("lg:px-4");
    expect(containerElement).toHaveClass("xl:max-w-[1280px]");
    expect(containerElement).toHaveClass("xl:px-4");
  });

  it("should merge custom className with default classes", () => {
    const { container } = render(
      <Container className="custom-class bg-red-500">
        <p>Content</p>
      </Container>,
    );

    const containerElement = container.firstChild;
    expect(containerElement).toHaveClass("custom-class");
    expect(containerElement).toHaveClass("bg-red-500");
    expect(containerElement).toHaveClass("mx-auto");
    expect(containerElement).toHaveClass("w-full");
  });

  it("should work with different HTML elements", () => {
    const { container: mainContainer } = render(
      <Container as="main">
        <p>Main content</p>
      </Container>,
    );

    const { container: sectionContainer } = render(
      <Container as="section">
        <p>Section content</p>
      </Container>,
    );

    const { container: articleContainer } = render(
      <Container as="article">
        <p>Article content</p>
      </Container>,
    );

    expect(mainContainer.firstChild?.nodeName).toBe("MAIN");
    expect(sectionContainer.firstChild?.nodeName).toBe("SECTION");
    expect(articleContainer.firstChild?.nodeName).toBe("ARTICLE");
  });

  it("should handle complex nested content", () => {
    render(
      <Container>
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <button>Button</button>
        </div>
      </Container>,
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Paragraph")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Button" })).toBeInTheDocument();
  });

  it("should preserve responsive breakpoint classes", () => {
    const { container } = render(<Container>Content</Container>);

    const element = container.firstChild;

    // Check all responsive max-width classes are present
    expect(element).toHaveClass("sm:max-w-[640px]");
    expect(element).toHaveClass("md:max-w-[768px]");
    expect(element).toHaveClass("lg:max-w-[1024px]");
    expect(element).toHaveClass("xl:max-w-[1280px]");
  });
});
