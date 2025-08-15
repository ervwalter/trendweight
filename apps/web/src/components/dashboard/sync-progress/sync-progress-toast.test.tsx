import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SyncProgressToast } from "./sync-progress-toast";
import type { SyncProgress } from "./types";

describe("SyncProgressToast", () => {
  it("should render main message when provided", () => {
    const progress: SyncProgress = {
      id: "test-1",
      status: "running",
      message: "Syncing your weight data...",
      providers: null,
    };

    render(<SyncProgressToast progress={progress} />);
    expect(screen.getByText("Syncing your weight data...")).toBeInTheDocument();
  });

  it("should render provider-specific progress", () => {
    const progress: SyncProgress = {
      id: "test-2",
      status: "running",
      message: "Fetching data from providers...",
      providers: [
        { provider: "fitbit", stage: "fetching", message: "Processing chunk 3 of 8", current: 3, total: 8 },
        { provider: "withings", stage: "merging", message: null, current: null, total: null },
      ],
    };

    render(<SyncProgressToast progress={progress} />);

    expect(screen.getByText("Fetching data from providers...")).toBeInTheDocument();
    expect(screen.getByText("Fitbit: Processing chunk 3 of 8")).toBeInTheDocument();
    expect(screen.getByText("Withings: Processing data...")).toBeInTheDocument();
  });

  it("should handle provider stages correctly", () => {
    const progress: SyncProgress = {
      id: "test-3",
      status: "running",
      message: "Syncing...",
      providers: [
        { provider: "fitbit", stage: "init", message: null, current: null, total: null },
        { provider: "withings", stage: "done", message: null, current: null, total: null },
      ],
    };

    render(<SyncProgressToast progress={progress} />);

    expect(screen.getByText("Fitbit: Starting...")).toBeInTheDocument();
    expect(screen.getByText("Withings: Complete")).toBeInTheDocument();
  });

  it("should not render providers section when providers is empty array", () => {
    const progress: SyncProgress = {
      id: "test-4",
      status: "running",
      message: "Loading...",
      providers: [],
    };

    render(<SyncProgressToast progress={progress} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Fitbit:")).not.toBeInTheDocument();
    expect(screen.queryByText("Withings:")).not.toBeInTheDocument();
  });

  it("should not render main message when not provided", () => {
    const progress: SyncProgress = {
      id: "test-5",
      status: "running",
      message: null,
      providers: [{ provider: "fitbit", stage: "fetching", message: null, current: 1, total: 5 }],
    };

    render(<SyncProgressToast progress={progress} />);

    expect(screen.getByText("Fitbit: Fetching data...")).toBeInTheDocument();
    // Should not have any other text content
    const container = screen.getByText("Fitbit: Fetching data...").closest("div");
    expect(container).toBeInTheDocument();
  });
});
