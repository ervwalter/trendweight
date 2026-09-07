import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DangerZoneSection } from "./danger-zone-section";
import { apiRequest, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/use-auth";

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...actual, apiRequest: vi.fn() };
});
vi.mock("@/lib/auth/use-auth");

function renderSection() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DangerZoneSection />
    </QueryClientProvider>,
  );
}

describe("DangerZoneSection", () => {
  const signOut = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ signOut, getToken: vi.fn().mockResolvedValue("token") } as any);
  });

  it("deletes the account and signs out only after confirmation", async () => {
    const user = userEvent.setup();
    vi.mocked(apiRequest).mockResolvedValue(undefined);
    renderSection();

    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(apiRequest).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes, Delete My Account" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledWith("/account-deleted"));
    expect(apiRequest).toHaveBeenCalledWith("/profile", expect.objectContaining({ method: "DELETE", token: "token" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("does nothing when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(apiRequest).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and shows the error when deletion fails", async () => {
    const user = userEvent.setup();
    vi.mocked(apiRequest).mockRejectedValue(new ApiError(500, "Server exploded"));
    renderSection();

    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    await user.click(screen.getByRole("button", { name: "Yes, Delete My Account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Error: Server exploded");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, Delete My Account" })).toBeEnabled();
    expect(signOut).not.toHaveBeenCalled();

    // A stale error is cleared when the dialog is reopened
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
