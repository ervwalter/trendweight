import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChangeArrow from "./ChangeArrow";

describe("ChangeArrow", () => {
  describe("arrow direction", () => {
    it("shows down arrow for negative change", () => {
      render(<ChangeArrow change={-5} />);
      expect(screen.getByText("↓")).toBeInTheDocument();
    });

    it("shows down arrow for zero change", () => {
      render(<ChangeArrow change={0} />);
      expect(screen.getByText("↓")).toBeInTheDocument();
    });

    it("shows up arrow for positive change", () => {
      render(<ChangeArrow change={5} />);
      expect(screen.getByText("↑")).toBeInTheDocument();
    });
  });

  describe("color based on intended direction", () => {
    it("shows neutral color when no intended direction", () => {
      const { container } = render(<ChangeArrow change={5} intendedDirection={0} />);
      const arrow = container.querySelector("span");
      expect(arrow).toHaveClass("text-gray-700");
      expect(arrow).toHaveAttribute("aria-label", "Neutral change");
    });

    it("shows green color for positive change with positive intended direction", () => {
      const { container } = render(<ChangeArrow change={5} intendedDirection={1} />);
      const arrow = container.querySelector("span");
      expect(arrow).toHaveClass("text-green-600");
      expect(arrow).toHaveAttribute("aria-label", "Positive change");
    });

    it("shows red color for positive change with negative intended direction", () => {
      const { container } = render(<ChangeArrow change={5} intendedDirection={-1} />);
      const arrow = container.querySelector("span");
      expect(arrow).toHaveClass("text-red-600");
      expect(arrow).toHaveAttribute("aria-label", "Negative change");
    });

    it("shows green color for negative change with negative intended direction", () => {
      const { container } = render(<ChangeArrow change={-5} intendedDirection={-1} />);
      const arrow = container.querySelector("span");
      expect(arrow).toHaveClass("text-green-600");
      expect(arrow).toHaveAttribute("aria-label", "Positive change");
    });

    it("shows red color for negative change with positive intended direction", () => {
      const { container } = render(<ChangeArrow change={-5} intendedDirection={1} />);
      const arrow = container.querySelector("span");
      expect(arrow).toHaveClass("text-red-600");
      expect(arrow).toHaveAttribute("aria-label", "Negative change");
    });

    it("shows green color for zero change with any intended direction", () => {
      const { container } = render(<ChangeArrow change={0} intendedDirection={1} />);
      const arrow = container.querySelector("span");
      expect(arrow).toHaveClass("text-green-600");
      expect(arrow).toHaveAttribute("aria-label", "Positive change");
    });
  });

  describe("accessibility", () => {
    it("includes appropriate aria-label for screen readers", () => {
      const { rerender } = render(<ChangeArrow change={5} intendedDirection={0} />);
      expect(screen.getByLabelText("Neutral change")).toBeInTheDocument();

      rerender(<ChangeArrow change={5} intendedDirection={1} />);
      expect(screen.getByLabelText("Positive change")).toBeInTheDocument();

      rerender(<ChangeArrow change={5} intendedDirection={-1} />);
      expect(screen.getByLabelText("Negative change")).toBeInTheDocument();
    });
  });
});
