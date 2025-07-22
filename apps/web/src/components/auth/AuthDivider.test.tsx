import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthDivider } from "./AuthDivider";

describe("AuthDivider", () => {
  it("should render the divider with 'or' text", () => {
    render(<AuthDivider />);

    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("should apply correct styling classes", () => {
    const { container } = render(<AuthDivider />);

    const outerDiv = container.firstChild;
    expect(outerDiv).toHaveClass("relative", "my-8");

    const lineDiv = outerDiv?.firstChild;
    expect(lineDiv).toHaveClass("absolute", "inset-0", "flex", "items-center");

    const borderDiv = lineDiv?.firstChild;
    expect(borderDiv).toHaveClass("w-full", "border-t", "border-gray-300");

    const textContainer = outerDiv?.lastChild;
    expect(textContainer).toHaveClass("relative", "flex", "justify-center", "text-sm");

    const textSpan = screen.getByText("or");
    expect(textSpan).toHaveClass("bg-gray-50", "px-4", "font-medium", "text-gray-700", "uppercase");
  });

  it("should have proper structure for visual divider", () => {
    const { container } = render(<AuthDivider />);

    // Should have the line element for the divider
    const borderElement = container.querySelector(".border-t");
    expect(borderElement).toBeInTheDocument();

    // Should have centered text
    const centeredText = container.querySelector(".justify-center");
    expect(centeredText).toBeInTheDocument();

    // Text should have background to overlay the line
    const backgroundText = container.querySelector(".bg-gray-50");
    expect(backgroundText).toBeInTheDocument();
  });

  it("should render consistently", () => {
    const { container: container1 } = render(<AuthDivider />);
    const { container: container2 } = render(<AuthDivider />);

    expect(container1.innerHTML).toBe(container2.innerHTML);
  });
});
