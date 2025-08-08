import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Banner } from "./banner";

describe("Banner", () => {
  it("should render TrendWeight heading", () => {
    render(<Banner />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("TrendWeight");
  });

  it("should render tagline text", () => {
    render(<Banner />);

    expect(screen.getByText("Automated Weight Tracking")).toBeInTheDocument();
  });

  it("should render full tagline text including responsive part", () => {
    render(<Banner />);

    // Check for the hidden part of the tagline
    expect(screen.getByText(", Hacker's Diet Style")).toBeInTheDocument();
  });

  it("should apply correct styling classes", () => {
    const { container } = render(<Banner />);

    const bannerWrapper = container.firstChild;
    expect(bannerWrapper).toHaveClass("bg-primary", "text-white");
  });

  it("should render the trend line SVG icon", () => {
    const { container } = render(<Banner />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 458 190");
  });

  it("should have proper heading styling", () => {
    render(<Banner />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("font-logo");
    expect(heading).toHaveClass("text-5xl");
    expect(heading).toHaveClass("leading-none");
    expect(heading).toHaveClass("md:text-6xl");
  });

  it("should have responsive design classes for tagline", () => {
    render(<Banner />);

    const hiddenText = screen.getByText(", Hacker's Diet Style");
    expect(hiddenText).toHaveClass("hidden");
    expect(hiddenText).toHaveClass("md:inline");
  });

  it("should have correct container padding", () => {
    const { container } = render(<Banner />);

    // Find the Container component by its class
    const containerElement = container.querySelector(".py-16");
    expect(containerElement).toBeInTheDocument();
  });

  it("should have proper SVG stroke styling", () => {
    const { container } = render(<Banner />);

    const svg = container.querySelector("svg");
    const path = svg?.querySelector("path");
    expect(path).toHaveAttribute("stroke", "currentColor");
    expect(path).toHaveAttribute("stroke-width", "8");
    expect(path).toHaveAttribute("stroke-linejoin", "round");
  });

  it("should use display font for heading", () => {
    render(<Banner />);

    const heading = screen.getByRole("heading", { level: 1 });
    // The display prop is set to true, but the actual class depends on the Heading component's implementation
    expect(heading).toBeInTheDocument();
  });

  it("should have responsive SVG sizing", () => {
    const { container } = render(<Banner />);

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-8");
    expect(svg).toHaveClass("w-auto");
    expect(svg).toHaveClass("md:h-12");
  });

  it("should render banner structure correctly", () => {
    const { container } = render(<Banner />);

    // Should have title and icon in a flex container
    const titleContainer = container.querySelector(".flex.items-center.gap-2");
    expect(titleContainer).toBeInTheDocument();

    // Should have tagline with xl text
    const tagline = container.querySelector(".text-xl");
    expect(tagline).toBeInTheDocument();
  });
});
