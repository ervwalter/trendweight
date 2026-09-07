import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Container } from "./container";

describe("Container", () => {
  it("renders its children", () => {
    render(
      <Container>
        <h1>Title</h1>
        <p>Paragraph</p>
        <button>Button</button>
      </Container>,
    );

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("Paragraph")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Button" })).toBeInTheDocument();
  });

  it.each([
    ["main", "main"],
    ["article", "article"],
    ["nav", "navigation"],
  ] as const)("renders as a <%s> element with the %s role", (as, role) => {
    render(<Container as={as}>Content</Container>);

    expect(screen.getByRole(role)).toHaveTextContent("Content");
  });
});
