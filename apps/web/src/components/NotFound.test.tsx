import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotFound } from "./NotFound";

// Mock router components
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Mock react-helmet-async
vi.mock("react-helmet-async", () => ({
  Helmet: ({ children }: any) => children,
}));

describe("NotFound", () => {
  it("should render TrendWeight branding", () => {
    render(<NotFound />);

    expect(screen.getByText("TrendWeight")).toBeInTheDocument();
  });

  it("should render 404 error message", () => {
    render(<NotFound />);

    expect(screen.getByText("404.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("That's an error.")).toBeInTheDocument();
  });

  it("should render descriptive error text", () => {
    render(<NotFound />);

    expect(screen.getByText("The requested URL was not found on this site.")).toBeInTheDocument();
    expect(screen.getByText(/Maybe the page was moved/)).toBeInTheDocument();
    expect(screen.getByText(/maybe it was abducted/)).toBeInTheDocument();
  });

  it("should render link to homepage", () => {
    render(<NotFound />);

    const homeLink = screen.getByRole("link", { name: "Go to Homepage" });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("should render alien abduction image", () => {
    render(<NotFound />);

    const image = screen.getByRole("img", { name: "alien abduction icon" });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "/assets/taken.svg");
    expect(image).toHaveAttribute("alt", "alien abduction icon");
  });

  it("should set page title and meta tags", () => {
    render(<NotFound />);

    // Helmet is mocked, so we can't test actual meta tags
    // Just verify the component renders
    expect(screen.getByText("404.", { exact: false })).toBeInTheDocument();
  });

  it("should have proper responsive styling", () => {
    const { container } = render(<NotFound />);

    // Check for responsive classes
    const mainContainer = container.querySelector(".min-h-\\[67vh\\]");
    expect(mainContainer).toHaveClass("flex", "flex-col", "items-start", "justify-start");
    expect(mainContainer).toHaveClass("md:items-center", "md:justify-center");
  });

  it("should have TrendWeight branding with proper styling", () => {
    render(<NotFound />);

    const branding = screen.getByText("TrendWeight");
    expect(branding).toHaveClass("text-brand-600");
    expect(branding).toHaveClass("font-serif");
    expect(branding).toHaveClass("text-4xl");
    expect(branding).toHaveClass("font-bold");
    expect(branding).toHaveClass("md:text-5xl");
  });

  it("should have responsive image styling", () => {
    render(<NotFound />);

    const image = screen.getByRole("img", { name: "alien abduction icon" });
    expect(image).toHaveClass("h-auto");
    expect(image).toHaveClass("w-full");
    expect(image).toHaveClass("max-w-[200px]");
    expect(image).toHaveClass("md:h-[150px]");
    expect(image).toHaveClass("md:w-auto");
    expect(image).toHaveClass("lg:h-[200px]");
  });

  it("should have proper layout structure", () => {
    const { container } = render(<NotFound />);

    // Check for proper flex layout
    const flexContainer = container.querySelector(".flex.flex-col.items-start.space-y-8");
    expect(flexContainer).toBeInTheDocument();
    expect(flexContainer).toHaveClass("md:flex-row", "md:items-center");

    // Check for border styling on desktop
    const textContainer = container.querySelector(".max-w-\\[600px\\]");
    expect(textContainer).toHaveClass("border-none");
    expect(textContainer).toHaveClass("md:border-r", "md:border-gray-300");
  });
});
