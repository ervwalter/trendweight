import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardPlaceholder from "./dashboard-placeholder";

describe("DashboardPlaceholder", () => {
  it("renders a silent, non-interactive stand-in for the dashboard", () => {
    const { container } = render(<DashboardPlaceholder />);

    expect(container).not.toBeEmptyDOMElement();
    // Skeletons only: nothing to read, focus or click while the data loads
    expect(container).toHaveTextContent("");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
