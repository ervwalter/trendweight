import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DashboardPlaceholder from "./DashboardPlaceholder";

describe("DashboardPlaceholder", () => {
  it("should render without crashing", () => {
    render(<DashboardPlaceholder />);
  });

  it("should have animate-pulse class for loading animation", () => {
    const { container } = render(<DashboardPlaceholder />);
    const animatedElement = container.querySelector(".animate-pulse");
    expect(animatedElement).toBeInTheDocument();
  });

  it("should render placeholder elements for buttons section", () => {
    const { container } = render(<DashboardPlaceholder />);
    const buttonPlaceholders = container.querySelectorAll(".h-10.w-64.rounded-md.bg-gray-200");
    expect(buttonPlaceholders).toHaveLength(2);
  });

  it("should render placeholder for chart section", () => {
    const { container } = render(<DashboardPlaceholder />);
    const chartPlaceholder = container.querySelector(".h-96.w-full.rounded.bg-gray-200");
    expect(chartPlaceholder).toBeInTheDocument();
  });

  it("should render table placeholder structure", () => {
    const { container } = render(<DashboardPlaceholder />);
    // Check that table section exists with appropriate structure
    const tableSection = container.querySelector(".space-y-2");
    expect(tableSection).toBeInTheDocument();
  });

  it("should render sections with placeholder elements", () => {
    const { container } = render(<DashboardPlaceholder />);
    // Check that multiple placeholder elements exist
    const placeholders = container.querySelectorAll(".bg-gray-200");
    expect(placeholders.length).toBeGreaterThan(10);
  });

  it("should render stats section placeholders", () => {
    const { container } = render(<DashboardPlaceholder />);
    const statsTitle = container.querySelector(".h-6.w-52.rounded.bg-gray-200");
    expect(statsTitle).toBeInTheDocument();
  });
});
