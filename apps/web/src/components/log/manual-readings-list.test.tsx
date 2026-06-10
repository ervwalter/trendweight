import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ManualReading } from "@/lib/api/types";
import { ManualReadingsList } from "./manual-readings-list";

const mockDeleteMutateAsync = vi.fn();
const mockDeleteAllMutateAsync = vi.fn();
const mockSaveMutateAsync = vi.fn();
const mockShowToast = vi.fn();

let mockUseMetric = false;
let mockReadings: ManualReading[] = [];

vi.mock("@/lib/api/queries", () => ({
  useProfile: () => ({ data: { useMetric: mockUseMetric } }),
  useManualReadings: () => ({ data: mockReadings }),
}));

vi.mock("@/lib/api/mutations", () => ({
  useSaveManualReading: () => ({ mutateAsync: mockSaveMutateAsync }),
  useDeleteManualReading: () => ({ mutateAsync: mockDeleteMutateAsync }),
  useDeleteAllManualReadings: () => ({ mutateAsync: mockDeleteAllMutateAsync }),
}));

vi.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useRouterState: () => "/log",
}));

function makeReadings(count: number): ManualReading[] {
  return Array.from({ length: count }, (_, i) => {
    const day = String((i % 28) + 1).padStart(2, "0");
    const month = String(Math.floor(i / 28) + 1).padStart(2, "0");
    return { date: `2024-${month}-${day}`, weight: 80 + (i % 5) };
  });
}

describe("ManualReadingsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMetric = false;
    mockReadings = [];
    mockDeleteMutateAsync.mockResolvedValue({});
    mockDeleteAllMutateAsync.mockResolvedValue({});
  });

  it("shows an empty state when there are no readings", () => {
    render(<ManualReadingsList />);

    expect(screen.getByText(/Nothing logged yet/)).toBeInTheDocument();
  });

  it("renders readings with weights in display units", () => {
    mockReadings = [{ date: "2024-05-01", weight: 81.8, fatRatio: 0.225 }];
    render(<ManualReadingsList />);

    expect(screen.getByText("May 1, 2024")).toBeInTheDocument();
    expect(screen.getByText("180.3 lb")).toBeInTheDocument();
    expect(screen.getByText(/22\.5%/)).toBeInTheDocument();
  });

  it("omits the fat line when a reading has no fat ratio", () => {
    mockReadings = [{ date: "2024-05-01", weight: 81.8 }];
    render(<ManualReadingsList />);

    expect(screen.queryByText(/% fat/)).not.toBeInTheDocument();
  });

  it("deletes a reading only after confirmation", async () => {
    const user = userEvent.setup();
    mockReadings = [{ date: "2024-05-01", weight: 81.8 }];
    render(<ManualReadingsList />);

    await user.click(screen.getByRole("button", { name: /Delete entry for May 1, 2024/ }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Delete this entry?")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith("2024-05-01");
    });
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });

  it("does not delete when confirmation is cancelled", async () => {
    const user = userEvent.setup();
    mockReadings = [{ date: "2024-05-01", weight: 81.8 }];
    render(<ManualReadingsList />);

    await user.click(screen.getByRole("button", { name: /Delete entry for May 1, 2024/ }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it("opens the edit dialog prefilled for a reading", async () => {
    const user = userEvent.setup();
    mockReadings = [{ date: "2024-05-01", weight: 81.8 }];
    render(<ManualReadingsList />);

    await user.click(screen.getByRole("button", { name: /Edit entry for May 1, 2024/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Edit Entry")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Date")).toHaveValue("2024-05-01");
  });

  it("deletes all readings after confirmation", async () => {
    const user = userEvent.setup();
    mockReadings = makeReadings(3);
    render(<ManualReadingsList />);

    await user.click(screen.getByRole("button", { name: "Delete all entries" }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete All" }));

    await waitFor(() => {
      expect(mockDeleteAllMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it("paginates when there are more than 50 readings", async () => {
    const user = userEvent.setup();
    mockReadings = makeReadings(60);
    render(<ManualReadingsList />);

    expect(screen.getByText("60 entries")).toBeInTheDocument();
    expect(screen.getAllByText("Page 1 of 2").length).toBeGreaterThan(0);
    expect(within(screen.getByRole("list", { name: "Weight log entries" })).getAllByRole("listitem")).toHaveLength(50);

    await user.click(screen.getAllByRole("button", { name: "Next page" })[0]);

    expect(screen.getAllByText("Page 2 of 2").length).toBeGreaterThan(0);
    expect(within(screen.getByRole("list", { name: "Weight log entries" })).getAllByRole("listitem")).toHaveLength(10);
  });

  it("does not show pagination for a single page", () => {
    mockReadings = makeReadings(5);
    render(<ManualReadingsList />);

    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();
  });
});
