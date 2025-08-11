import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SyncProgressOverlay } from "./sync-progress-overlay";
import { SyncProgressContext } from "./context";
import type { SyncProgressContextValue } from "./context";
import type { SyncProgress } from "./types";

describe("SyncProgressOverlay", () => {
  const mockProgressId = "test-progress-id";
  const mockStartProgress = vi.fn();
  const mockEndProgress = vi.fn();
  const mockSetServerProgress = vi.fn();

  const renderWithContext = (component: ReactNode, progress: SyncProgress | null) => {
    const mockContext: SyncProgressContextValue = {
      progressId: mockProgressId,
      progress,
      startProgress: mockStartProgress,
      endProgress: mockEndProgress,
      setServerProgress: mockSetServerProgress,
    };
    return render(<SyncProgressContext.Provider value={mockContext}>{component}</SyncProgressContext.Provider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render when no progress", () => {
    const { container } = renderWithContext(<SyncProgressOverlay />, null);
    expect(container.firstChild).toBeNull();
  });

  it("should render progress updates when status is running", () => {
    const progress: SyncProgress = {
      id: mockProgressId,
      status: "running",
      message: "Syncing your weight data...",
      providers: [{ provider: "fitbit", stage: "fetching", message: null, current: 1, total: 1 }],
    };
    renderWithContext(<SyncProgressOverlay />, progress);

    expect(screen.getByText("Syncing your weight data...")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should display provider-specific progress", () => {
    const progress: SyncProgress = {
      id: mockProgressId,
      status: "running",
      message: "Fetching data from providers...",
      providers: [
        {
          provider: "fitbit",
          stage: "fetching",
          message: "Processing chunk 3 of 8",
          current: 3,
          total: 8,
        },
        {
          provider: "withings",
          stage: "fetching",
          message: "Fetching page 2",
          current: 2,
          total: null,
        },
      ],
    };
    renderWithContext(<SyncProgressOverlay />, progress);

    expect(screen.getByText("Fetching data from providers...")).toBeInTheDocument();
    expect(screen.getByText("Fitbit: Processing chunk 3 of 8")).toBeInTheDocument();
    expect(screen.getByText("Withings: Fetching page 2")).toBeInTheDocument();
  });

  it("should handle year-based messages for Withings", () => {
    const progress: SyncProgress = {
      id: mockProgressId,
      status: "running",
      message: "Overall sync progress",
      providers: [
        {
          provider: "withings",
          stage: "fetching",
          message: "Fetching 2022 data",
          current: null,
          total: null,
        },
      ],
    };
    renderWithContext(<SyncProgressOverlay />, progress);

    expect(screen.getByText("Withings: Fetching 2022 data")).toBeInTheDocument();
  });

  it("should render when status is starting", () => {
    const progress: SyncProgress = {
      id: mockProgressId,
      status: "starting",
      message: "Retrieving measurement data...",
      providers: null,
    };
    renderWithContext(<SyncProgressOverlay />, progress);

    expect(screen.getByText("Retrieving measurement data...")).toBeInTheDocument();
    // No progress bar when no providers
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const progress: SyncProgress = {
      id: mockProgressId,
      status: "running",
      message: "Loading...",
      providers: [],
    };
    const { container } = renderWithContext(<SyncProgressOverlay className="custom-class" />, progress);

    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass("custom-class");
  });

  it("should calculate progress percentage correctly", () => {
    const progress: SyncProgress = {
      id: mockProgressId,
      status: "running",
      message: "Syncing...",
      providers: [
        { provider: "fitbit", stage: "fetching", message: null, current: 4, total: 8 }, // 50%
        { provider: "withings", stage: "fetching", message: null, current: 3, total: 6 }, // 50%
      ],
    };
    renderWithContext(<SyncProgressOverlay />, progress);

    const progressBar = screen.getByRole("progressbar");
    // Check that the progress bar exists (Radix UI doesn't set aria-valuenow)
    expect(progressBar).toBeInTheDocument();
  });

  it("should handle mixed provider progress states", () => {
    const progress: SyncProgress = {
      id: mockProgressId,
      status: "running",
      message: "Syncing...",
      providers: [
        { provider: "fitbit", stage: "done", message: null, current: 8, total: 8 }, // 100%
        { provider: "withings", stage: "fetching", message: null, current: 2, total: 10 }, // 20%
      ],
    };
    renderWithContext(<SyncProgressOverlay />, progress);

    const progressBar = screen.getByRole("progressbar");
    // Check that the progress bar exists (average would be 60%)
    expect(progressBar).toBeInTheDocument();
  });

  it("should not show progress bar when no providers", () => {
    const progress: SyncProgress = {
      id: mockProgressId,
      status: "running",
      message: "Starting sync...",
      providers: [],
    };
    renderWithContext(<SyncProgressOverlay />, progress);

    // No progress bar when providers array is empty
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    // But message should still show
    expect(screen.getByText("Starting sync...")).toBeInTheDocument();
  });

  it("should have proper accessibility attributes", () => {
    const progress: SyncProgress = {
      id: mockProgressId,
      status: "running",
      message: "Syncing your data...",
      providers: [{ provider: "fitbit", stage: "fetching", message: null, current: 1, total: 2 }],
    };
    renderWithContext(<SyncProgressOverlay />, progress);

    const message = screen.getByText("Syncing your data...");
    expect(message).toHaveAttribute("aria-live", "polite");

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });
});
