import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import type { ManualReading } from "@/lib/api/types";
import { mockAuth } from "@/test/auth";
import { buildMeasurementsResponse } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json } from "@/test/msw";
import { renderWithProviders } from "@/test/render";
import { ManualReadingDialog } from "./manual-reading-dialog";

vi.mock("@/lib/auth/use-auth");

vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (state: { location: { pathname: string } }) => unknown }) => select({ location: { pathname: "/dashboard" } }),
  Link: ({ children, to, onClick }: { children: React.ReactNode; to: string; onClick?: () => void }) => (
    <a href={to} onClick={onClick}>
      {children}
    </a>
  ),
}));

// The form has its own tests; here it only needs to report a save
vi.mock("./manual-reading-form", () => ({
  ManualReadingForm: ({ onSaved, initialReading }: { onSaved?: () => void; initialReading?: ManualReading }) => (
    <button type="button" onClick={onSaved}>
      {initialReading ? `Save ${initialReading.date}` : "Save reading"}
    </button>
  ),
}));

describe("ManualReadingDialog", () => {
  beforeEach(() => {
    mockAuth();
    // Mounting the dialog warms the latest-reading cache
    server.use(http.get("/api/data", () => json(200, buildMeasurementsResponse())));
  });

  it("opens with the log-weight title and closes when the form reports a save", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithProviders(<ManualReadingDialog open onOpenChange={onOpenChange} />);

    expect(screen.getByRole("dialog", { name: "Log Weight" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit your weight log" })).toHaveAttribute("href", "/log");

    await user.click(screen.getByRole("button", { name: "Save reading" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("edits the given reading without offering the manage link", () => {
    renderWithProviders(<ManualReadingDialog open onOpenChange={vi.fn()} initialReading={{ date: "2024-05-01", weight: 80 }} />);

    expect(screen.getByRole("dialog", { name: "Edit Entry" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save 2024-05-01" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit your weight log" })).not.toBeInTheDocument();
  });

  it("renders nothing while closed", () => {
    renderWithProviders(<ManualReadingDialog open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
