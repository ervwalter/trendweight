import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocalDate } from "@js-joda/core";
import { Download } from "../Download";
import type { ProviderLink } from "../../../lib/api/types";

// Mock the API hooks
vi.mock("../../../lib/api/queries", () => ({
  useProviderLinks: vi.fn(),
}));

// Mock the data hook
vi.mock("../../../lib/download/useScaleReadingsData", () => ({
  useScaleReadingsData: vi.fn(),
}));

// Mock the CSV export
vi.mock("../../../lib/download/csvExport", () => ({
  downloadScaleReadingsCSV: vi.fn(),
}));

// Mock the provider display utility
vi.mock("../../../lib/utils/providerDisplay", () => ({
  getProviderDisplayName: (provider: string) => {
    const names: Record<string, string> = {
      withings: "Withings",
      fitbit: "Fitbit",
      legacy: "Legacy Data",
    };
    return names[provider] || provider;
  },
}));

import { useProviderLinks } from "../../../lib/api/queries";
import { useScaleReadingsData } from "../../../lib/download/useScaleReadingsData";

describe("Download", () => {
  const mockProviderLinks = vi.mocked(useProviderLinks);
  const mockUseScaleReadingsData = vi.mocked(useScaleReadingsData);

  const createProviderLink = (provider: string, isDisabled = false): ProviderLink => ({
    provider,
    connectedAt: "2024-01-01T00:00:00Z",
    hasToken: true,
    isDisabled,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock return values
    mockUseScaleReadingsData.mockReturnValue({
      readings: [],
      profile: { useMetric: false },
    } as any);
  });

  it("shows message when no providers are connected", () => {
    mockProviderLinks.mockReturnValue({ data: [] } as any);

    render(<Download />);

    expect(screen.getByText("Download Your Data")).toBeInTheDocument();
    expect(screen.getByText("No providers connected. Please connect a scale provider from the settings page.")).toBeInTheDocument();
  });

  it("shows download interface when providers are connected", () => {
    mockProviderLinks.mockReturnValue({
      data: [createProviderLink("withings")],
    } as any);

    render(<Download />);

    expect(screen.getByText("Download Your Data")).toBeInTheDocument();
    expect(screen.getByText("Download as CSV")).toBeInTheDocument();
  });

  it("includes enabled legacy provider in the view toggle", () => {
    mockProviderLinks.mockReturnValue({
      data: [createProviderLink("withings"), createProviderLink("legacy", false)],
    } as any);

    render(<Download />);

    expect(screen.getByText("Computed Values")).toBeInTheDocument();
    expect(screen.getByText("Withings Data")).toBeInTheDocument();
    expect(screen.getByText("Legacy Data")).toBeInTheDocument();
  });

  it("excludes disabled legacy provider from the view toggle", () => {
    mockProviderLinks.mockReturnValue({
      data: [createProviderLink("withings"), createProviderLink("legacy", true)],
    } as any);

    render(<Download />);

    expect(screen.getByText("Computed Values")).toBeInTheDocument();
    expect(screen.getByText("Withings Data")).toBeInTheDocument();
    expect(screen.queryByText("Legacy Data")).not.toBeInTheDocument();
  });

  it("filters out disabled providers from connected count", () => {
    mockProviderLinks.mockReturnValue({
      data: [createProviderLink("withings", true), createProviderLink("legacy", true)],
    } as any);

    render(<Download />);

    expect(screen.getByText("No providers connected. Please connect a scale provider from the settings page.")).toBeInTheDocument();
  });

  it("shows data when readings are available", () => {
    mockProviderLinks.mockReturnValue({
      data: [createProviderLink("legacy", false)],
    } as any);

    mockUseScaleReadingsData.mockReturnValue({
      readings: [
        {
          date: LocalDate.parse("2024-01-01"),
          weight: 70,
          provider: "legacy",
        },
      ],
      profile: { useMetric: true },
    } as any);

    render(<Download />);

    expect(screen.getByText("Download as CSV")).toBeInTheDocument();
    expect(screen.queryByText("No data available for the selected view.")).not.toBeInTheDocument();
  });

  it("shows message when no data is available for selected view", () => {
    mockProviderLinks.mockReturnValue({
      data: [createProviderLink("withings")],
    } as any);

    mockUseScaleReadingsData.mockReturnValue({
      readings: [],
      profile: { useMetric: false },
    } as any);

    render(<Download />);

    expect(screen.getByText("No data available for the selected view.")).toBeInTheDocument();
  });
});
