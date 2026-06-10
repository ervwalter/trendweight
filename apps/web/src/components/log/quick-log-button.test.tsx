import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuickLogButton } from "./quick-log-button";

vi.mock("@/lib/api/queries", () => ({
  useProfile: () => ({ data: { useMetric: false } }),
  useManualReadings: () => ({ data: [] }),
}));

vi.mock("@/lib/api/mutations", () => ({
  useSaveManualReading: () => ({ mutateAsync: vi.fn() }),
  useDeleteManualReading: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: () => "/dashboard",
}));

describe("QuickLogButton", () => {
  it("opens the log dialog from the primary button", async () => {
    const user = userEvent.setup();
    render(<QuickLogButton />);

    await user.click(screen.getByRole("button", { name: /Log Weight/ }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("links to the manual readings page from the menu", async () => {
    const user = userEvent.setup();
    render(<QuickLogButton />);

    await user.click(screen.getByRole("button", { name: "More weight log options" }));

    const item = await screen.findByRole("menuitem", { name: /Edit your weight log/ });
    expect(item).toHaveAttribute("href", "/log");
  });
});
