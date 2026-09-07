import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { mockAuth, TEST_TOKEN } from "@/test/auth";
import { server } from "@/test/mocks/server";
import { json, recordRequests } from "@/test/msw";
import { renderWithProviders } from "@/test/render";
import { Migration } from "./migration";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));
vi.mock("@/lib/auth/use-auth");

const COMPLETE_PATH = "/api/profile/complete-migration";

describe("Migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it("explains the migration and links to the announcement", () => {
    renderWithProviders(<Migration />);

    expect(screen.getByRole("heading", { name: "Welcome Back!" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See what's new/ })).toHaveAttribute("href", "https://ewal.dev/trendweight-v2-has-launched");
    expect(screen.getByText(/Your account has been migrated from classic TrendWeight/)).toBeInTheDocument();
    expect(screen.getByText(/Your historical data will sync shortly/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to Dashboard" })).toBeEnabled();
  });

  it("marks the migration complete and replaces the route with the dashboard", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(COMPLETE_PATH, async () => {
        await gate;
        return json(200, {});
      }),
    );
    const recorder = recordRequests();
    renderWithProviders(<Migration />);

    await user.click(screen.getByRole("button", { name: "Continue to Dashboard" }));

    // Disabled while the request is in flight so it cannot be sent twice
    expect(await screen.findByRole("button", { name: "Loading..." })).toBeDisabled();
    expect(mockNavigate).not.toHaveBeenCalled();

    release();

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true }));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const [request] = await recorder.settled();
    expect(request).toMatchObject({ method: "POST", path: COMPLETE_PATH, headers: { authorization: `Bearer ${TEST_TOKEN}` } });
  });

  it("stays on the page and re-enables the button when the API fails", async () => {
    const user = userEvent.setup();
    server.use(http.post(COMPLETE_PATH, () => json(500, { error: "Server exploded" })));
    renderWithProviders(<Migration />);

    await user.click(screen.getByRole("button", { name: "Continue to Dashboard" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Continue to Dashboard" })).toBeEnabled());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Welcome Back!" })).toBeInTheDocument();
  });
});
