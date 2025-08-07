import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DashboardPlaceholder from "./DashboardPlaceholder";

describe("DashboardPlaceholder", () => {
  it("should render without crashing", () => {
    render(<DashboardPlaceholder />);
  });

  it("should render skeleton elements with proper data-slot attributes", () => {
    const { container } = render(<DashboardPlaceholder />);
    const skeletonElements = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletonElements.length).toBeGreaterThan(10);
  });

  it("should render placeholder elements for buttons section", () => {
    const { container } = render(<DashboardPlaceholder />);
    const buttonSection = container.querySelector(".mb-4.flex.flex-col-reverse");
    const buttonSkeletons = buttonSection?.querySelectorAll("[data-slot='skeleton']");
    expect(buttonSkeletons).toHaveLength(2);
  });

  it("should render placeholder for chart section", () => {
    const { container } = render(<DashboardPlaceholder />);
    const chartSkeletons = container.querySelectorAll("[data-slot='skeleton'].h-96");
    expect(chartSkeletons).toHaveLength(1);
  });

  it("should render table placeholder structure", () => {
    const { container } = render(<DashboardPlaceholder />);
    // Check that table section exists with appropriate structure
    const tableSection = container.querySelector(".space-y-2");
    expect(tableSection).toBeInTheDocument();
  });

  it("should render multiple skeleton elements throughout", () => {
    const { container } = render(<DashboardPlaceholder />);
    // Check that multiple skeleton elements exist
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(10);
  });

  it("should render stats section placeholders", () => {
    const { container } = render(<DashboardPlaceholder />);
    // Look for skeleton elements in the stats section
    const statsSection = container.querySelector(".flex.flex-col.gap-4");
    const skeletons = statsSection?.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons).toBeDefined();
    expect(skeletons!.length).toBeGreaterThan(0);
  });
});
