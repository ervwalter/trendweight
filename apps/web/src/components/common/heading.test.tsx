import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Heading } from "./heading";

describe("Heading", () => {
  it.each([1, 2, 3, 4, 5, 6] as const)("renders an h%s", (level) => {
    render(<Heading level={level}>Test H{level}</Heading>);

    expect(screen.getByRole("heading", { level })).toHaveTextContent(`Test H${level}`);
  });

  it("passes through HTML props", () => {
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
