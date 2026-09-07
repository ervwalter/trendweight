import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SyncProgressToast } from "./sync-progress-toast";
import type { SyncProgress } from "./types";

// Wraps the toast so its complete text can be asserted exactly
const renderToast = (progress: SyncProgress) => {
  render(
    <div data-testid="toast">
      <SyncProgressToast progress={progress} />
    </div>,
  );
  return screen.getByTestId("toast");
};

describe("SyncProgressToast", () => {
  it("shows only the main message when there is no provider detail", () => {
    const toast = renderToast({ id: "test-1", status: "running", message: "Syncing your weight data...", providers: null });

    expect(toast).toHaveTextContent(/^Syncing your weight data\.\.\.$/);
  });

  it("lists each provider's own message under the main message", () => {
    const toast = renderToast({
      id: "test-2",
      status: "running",
      message: "Fetching data from providers...",
      providers: [
        { provider: "fitbit", stage: "fetching", message: "Processing chunk 3 of 8", current: 3, total: 8 },
        { provider: "withings", stage: "merging", message: null, current: null, total: null },
      ],
    });

    expect(toast).toHaveTextContent(/^Fetching data from providers\.\.\.Fitbit: Processing chunk 3 of 8Withings: Processing data\.\.\.$/);
  });

  it("describes each stage when a provider has no message", () => {
    const toast = renderToast({
      id: "test-3",
      status: "running",
      message: "Syncing...",
      providers: [
        { provider: "fitbit", stage: "init", message: null, current: null, total: null },
        { provider: "withings", stage: "fetching", message: null, current: null, total: null },
        { provider: "manual", stage: "merging", message: null, current: null, total: null },
        { provider: "legacy", stage: "done", message: null, current: null, total: null },
      ],
    });

    expect(toast).toHaveTextContent(/^Syncing\.\.\.Fitbit: Starting\.\.\.Withings: Fetching data\.\.\.Weight Log: Processing data\.\.\.Legacy Data: Complete$/);
  });

  it("falls back to the raw stage name for a stage without a description", () => {
    const toast = renderToast({
      id: "test-4",
      status: "running",
      message: null,
      providers: [{ provider: "fitbit", stage: "error", message: null, current: null, total: null }],
    });

    expect(toast).toHaveTextContent(/^Fitbit: error$/);
  });

  it("renders no provider lines for an empty provider list", () => {
    const toast = renderToast({ id: "test-5", status: "running", message: "Loading...", providers: [] });

    expect(toast).toHaveTextContent(/^Loading\.\.\.$/);
  });

  it("renders only the provider lines without a main message", () => {
    const toast = renderToast({
      id: "test-6",
      status: "running",
      message: null,
      providers: [{ provider: "fitbit", stage: "fetching", message: null, current: 1, total: 5 }],
    });

    expect(toast).toHaveTextContent(/^Fitbit: Fetching data\.\.\.$/);
  });
});
