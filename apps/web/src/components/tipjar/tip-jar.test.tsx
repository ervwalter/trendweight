import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TipJar } from "./tip-jar";

describe("TipJar", () => {
  it("renders the Ko-fi button as a safe external link without injected markup", () => {
    const { container } = render(<TipJar />);

    const kofi = screen.getByRole("link", { name: /Buy me a Coffee/ });
    expect(kofi).toHaveAttribute("href", "https://ko-fi.com/ervwalter");
    expect(kofi).toHaveAttribute("target", "_blank");
    expect(kofi).toHaveAttribute("rel", "noopener noreferrer");

    expect(container.querySelector("style")).toBeNull();
    expect(container.querySelector("link")).toBeNull();
  });

  it("opens every external link with rel noopener noreferrer", () => {
    render(<TipJar />);

    const external = screen.getAllByRole("link").filter((link) => link.getAttribute("target") === "_blank");
    expect(external.length).toBeGreaterThan(1);
    for (const link of external) {
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });
});
