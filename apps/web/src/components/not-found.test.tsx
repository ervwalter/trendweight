import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotFound } from "./not-found";

// There is no router in this test; Link renders as a plain anchor
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("NotFound", () => {
  it("explains the 404 under the site name", () => {
    render(<NotFound />);

    expect(screen.getByText("TrendWeight")).toBeInTheDocument();
    expect(screen.getByText(/That's an error\.$/)).toHaveTextContent("404. That's an error.");
    expect(screen.getByText("The requested URL was not found on this site.")).toBeInTheDocument();
    expect(screen.getByText(/maybe it was abducted/)).toBeInTheDocument();
  });

  it("links back to the homepage", () => {
    render(<NotFound />);

    expect(screen.getByRole("link", { name: "Go to Homepage" })).toHaveAttribute("href", "/");
  });

  it("shows the abduction illustration", () => {
    render(<NotFound />);

    expect(screen.getByRole("img", { name: "alien abduction icon" })).toHaveAttribute("src", "/taken.svg");
  });

  it("sets the page title and blocks indexing", async () => {
    render(<NotFound />);

    await waitFor(() => {
      expect(document.title).toBe("Error 404 (Not Found) - TrendWeight");
    });
    expect(document.head.innerHTML).toContain('<meta name="robots" content="noindex, nofollow">');
  });
});
