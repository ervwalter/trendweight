import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Banner } from "./banner";

describe("Banner", () => {
  it("renders the TrendWeight heading", () => {
    render(<Banner />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("TrendWeight");
  });

  it("renders the tagline with its wide-screen suffix", () => {
    render(<Banner />);

    expect(screen.getByText("Automated Weight Tracking")).toBeInTheDocument();
    expect(screen.getByText(", Hacker's Diet Style")).toBeInTheDocument();
  });
});
