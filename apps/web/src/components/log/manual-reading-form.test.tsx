import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocalDate } from "@js-joda/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ManualReading } from "@/lib/api/types";
import { ManualReadingForm } from "./manual-reading-form";

const mockSaveMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
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
}));

vi.mock("@/lib/hooks/use-toast", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

describe("ManualReadingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMetric = false;
    mockReadings = [];
    mockSaveMutateAsync.mockResolvedValue({});
    mockDeleteMutateAsync.mockResolvedValue({});
  });

  it("defaults the date to today", () => {
    render(<ManualReadingForm />);

    expect(screen.getByLabelText("Date")).toHaveValue(LocalDate.now().toString());
  });

  it("shows the weight unit from the profile", () => {
    mockUseMetric = true;
    render(<ManualReadingForm />);

    expect(screen.getByText("Weight (kg)")).toBeInTheDocument();
  });

  it("requires a weight", async () => {
    const user = userEvent.setup();
    render(<ManualReadingForm />);

    await user.click(screen.getByRole("button", { name: "Log Weight" }));

    expect(await screen.findByText("Weight is required")).toBeInTheDocument();
    expect(mockSaveMutateAsync).not.toHaveBeenCalled();
  });

  it("rejects out-of-range imperial weights with the unit in the message", async () => {
    const user = userEvent.setup();
    render(<ManualReadingForm />);

    await user.type(screen.getByLabelText(/Weight/), "5000");
    await user.click(screen.getByRole("button", { name: "Log Weight" }));

    expect(await screen.findByText("Weight must be between 20 and 660 lbs")).toBeInTheDocument();
  });

  it("rejects out-of-range metric weights", async () => {
    mockUseMetric = true;
    const user = userEvent.setup();
    render(<ManualReadingForm />);

    await user.type(screen.getByLabelText(/Weight/), "500");
    await user.click(screen.getByRole("button", { name: "Log Weight" }));

    expect(await screen.findByText("Weight must be between 10 and 300 kg")).toBeInTheDocument();
  });

  it("rejects an invalid body fat percentage", async () => {
    const user = userEvent.setup();
    render(<ManualReadingForm />);

    await user.type(screen.getByLabelText(/Weight/), "180");
    await user.type(screen.getByLabelText(/Body Fat/), "95");
    await user.click(screen.getByRole("button", { name: "Log Weight" }));

    expect(await screen.findByText("Body fat must be between 2% and 80%")).toBeInTheDocument();
  });

  it("converts pounds to kg and percent to ratio on submit", async () => {
    const user = userEvent.setup();
    render(<ManualReadingForm />);

    const date = screen.getByLabelText("Date");
    await user.clear(date);
    await user.type(date, "2024-05-01");
    await user.type(screen.getByLabelText(/Weight/), "180.5");
    await user.type(screen.getByLabelText(/Body Fat/), "22.5");
    await user.click(screen.getByRole("button", { name: "Log Weight" }));

    await waitFor(() => {
      expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
    });

    const saved = mockSaveMutateAsync.mock.calls[0][0] as ManualReading;
    expect(saved.date).toBe("2024-05-01");
    expect(saved.weight).toBeCloseTo(180.5 / 2.20462262, 2);
    expect(saved.fatRatio).toBeCloseTo(0.225, 4);

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
    // Add mode resets the weight field after a successful save
    expect(screen.getByLabelText(/Weight/)).toHaveValue("");
  });

  it("sends metric weights unconverted", async () => {
    mockUseMetric = true;
    const user = userEvent.setup();
    render(<ManualReadingForm />);

    await user.type(screen.getByLabelText(/Weight/), "82.5");
    await user.click(screen.getByRole("button", { name: "Log Weight" }));

    await waitFor(() => {
      expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
    });
    expect((mockSaveMutateAsync.mock.calls[0][0] as ManualReading).weight).toBe(82.5);
  });

  it("omits fatRatio when body fat is blank", async () => {
    const user = userEvent.setup();
    render(<ManualReadingForm />);

    await user.type(screen.getByLabelText(/Weight/), "180");
    await user.click(screen.getByRole("button", { name: "Log Weight" }));

    await waitFor(() => {
      expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
    });
    expect((mockSaveMutateAsync.mock.calls[0][0] as ManualReading).fatRatio).toBeUndefined();
  });

  it("accepts a comma as the decimal separator", async () => {
    mockUseMetric = true;
    const user = userEvent.setup();
    render(<ManualReadingForm />);

    await user.type(screen.getByLabelText(/Weight/), "82,5");
    await user.click(screen.getByRole("button", { name: "Log Weight" }));

    await waitFor(() => {
      expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
    });
    expect((mockSaveMutateAsync.mock.calls[0][0] as ManualReading).weight).toBe(82.5);
  });

  it("shows the most recent entry as a reference and uses it as the placeholder", () => {
    mockReadings = [{ date: LocalDate.now().minusDays(1).toString(), weight: 84.0 }];
    render(<ManualReadingForm />);

    expect(screen.getByText(/Last entry:/)).toHaveTextContent(/yesterday/);
    expect(screen.getByLabelText(/Weight/)).toHaveAttribute("placeholder", "185.2");
  });

  it("describes how long ago the last entry was", () => {
    mockReadings = [{ date: LocalDate.now().minusDays(21).toString(), weight: 84.0 }];
    render(<ManualReadingForm />);

    expect(screen.getByText(/Last entry:/)).toHaveTextContent(/3 weeks ago/);
  });

  it("hides the last-entry reference in edit mode", () => {
    const initialReading: ManualReading = { date: "2024-05-01", weight: 81.8 };
    mockReadings = [initialReading];
    render(<ManualReadingForm initialReading={initialReading} />);

    expect(screen.queryByText(/Last entry:/)).not.toBeInTheDocument();
  });

  it("shows a replace hint and Replace label when the date already has an entry", async () => {
    mockReadings = [{ date: LocalDate.now().toString(), weight: 84.0 }];
    render(<ManualReadingForm />);

    expect(await screen.findByText(/Replaces today's entry/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace Entry" })).toBeInTheDocument();
    // The replace hint supersedes the last-entry reference
    expect(screen.queryByText(/Last entry:/)).not.toBeInTheDocument();
  });

  it("prefills values in edit mode and deletes the original when the date changes", async () => {
    const user = userEvent.setup();
    const initialReading: ManualReading = { date: "2024-05-01", weight: 81.8, fatRatio: 0.225 };
    mockReadings = [initialReading];

    render(<ManualReadingForm initialReading={initialReading} />);

    // kg -> lbs prefill, ratio -> percent prefill
    expect(screen.getByLabelText(/Weight/)).toHaveValue("180.3");
    expect(screen.getByLabelText(/Body Fat/)).toHaveValue("22.5");
    expect(screen.getByLabelText("Date")).toHaveValue("2024-05-01");

    const date = screen.getByLabelText("Date");
    await user.clear(date);
    await user.type(date, "2024-05-02");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mockSaveMutateAsync).toHaveBeenCalledTimes(1);
    });
    expect((mockSaveMutateAsync.mock.calls[0][0] as ManualReading).date).toBe("2024-05-02");
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith("2024-05-01");
  });

  it("shows an error toast when saving fails", async () => {
    mockSaveMutateAsync.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<ManualReadingForm />);

    await user.type(screen.getByLabelText(/Weight/), "180");
    await user.click(screen.getByRole("button", { name: "Log Weight" }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "error" }));
    });
  });
});
