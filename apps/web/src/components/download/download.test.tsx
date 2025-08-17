import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client before any other imports
vi.mock("@/lib/realtime/client", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        if (callback) callback("subscribed");
        return vi.fn();
      }),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock realtime progress hook to return null (no progress)
vi.mock("@/lib/realtime/use-realtime-progress", () => ({
  useRealtimeProgress: () => ({
    status: null,
    message: null,
    providers: null,
    isTerminal: false,
  }),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download } from "./download";
import { LocalDate } from "@js-joda/core";
import type { ProviderLink } from "@/lib/api/types";
import { SyncProgressProvider } from "@/components/dashboard/sync-progress";

// Mock dependencies
vi.mock("@/lib/api/queries", () => ({
  useProviderLinks: vi.fn(),
}));

vi.mock("@/lib/download/use-scale-readings-data", () => ({
  useScaleReadingsData: vi.fn(),
}));

vi.mock("@/lib/download/csv-export", () => ({
  downloadScaleReadingsCSV: vi.fn(),
}));

// Mock the provider display utility
vi.mock("@/lib/utils/provider-display", () => ({
  getProviderDisplayName: (provider: string) => {
    const names: Record<string, string> = {
      withings: "Withings",
      fitbit: "Fitbit",
      legacy: "Legacy Data",
    };
    return names[provider] || provider;
  },
}));

// Mock UI components
vi.mock("@/components/ui/heading", () => ({
  Heading: ({ children }: any) => <h1>{children}</h1>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button onClick={onClick} className={`${variant} ${size} ${className}`}>
      {children}
    </button>
  ),
}));

vi.mock("./scale-readings-data-table", () => ({
  ScaleReadingsDataTable: ({ readings, viewType, useMetric }: any) => {
    // Simple mock that simulates pagination behavior
    const pageSize = 50;
    const totalPages = Math.ceil(readings.length / pageSize);
    const displayedReadings = readings.slice(0, pageSize);

    return (
      <div data-testid="scale-readings-table">
        <div>View: {viewType}</div>
        <div>Metric: {useMetric ? "true" : "false"}</div>
        <div>Readings: {displayedReadings.length}</div>
        <div>Total: {readings.length}</div>
        {totalPages > 1 && (
          <div data-testid="pagination">
            <span>Page 1 of {totalPages}</span>
            <span> - {readings.length} readings</span>
            <button disabled>Previous</button>
            <button>Next</button>
          </div>
        )}
      </div>
    );
  },
}));

vi.mock("./view-toggle-buttons", () => ({
  ViewToggleButtons: ({ viewType, onViewChange, providerLinks }: any) => (
    <div data-testid="view-toggle-buttons">
      <button onClick={() => onViewChange("computed")} data-selected={viewType === "computed"}>
        Computed
      </button>
      {providerLinks.map((link: any) => (
        <button key={link.provider} onClick={() => onViewChange(link.provider)} data-selected={viewType === link.provider}>
          {link.provider}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("./sort-toggle", () => ({
  SortToggle: ({ sortNewestFirst, onSortChange }: any) => (
    <button onClick={() => onSortChange(!sortNewestFirst)} data-testid="sort-toggle">
      Sort: {sortNewestFirst ? "Newest First" : "Oldest First"}
    </button>
  ),
}));

vi.mock("react-icons/hi", () => ({
  HiDownload: () => <span>Download Icon</span>,
}));

// Import mocked functions
import { useProviderLinks } from "@/lib/api/queries";
import { useScaleReadingsData } from "@/lib/download/use-scale-readings-data";
import { downloadScaleReadingsCSV } from "@/lib/download/csv-export";

describe("Download", () => {
  const createProviderLink = (provider: string, isDisabled = false): ProviderLink => ({
    provider,
    connectedAt: "2024-01-01T00:00:00Z",
    hasToken: true,
    isDisabled,
  });

  const mockProviderLinks = [
    { provider: "fitbit", hasToken: true, connectedAt: "2024-01-01T00:00:00Z" },
    { provider: "withings", hasToken: false, connectedAt: "2024-01-01T00:00:00Z" },
  ];

  const mockReadings = Array.from({ length: 125 }, (_, i) => ({
    date: LocalDate.of(2024, 1, 1).plusDays(i),
    weight: 180 + i * 0.1,
    trend: 180 + i * 0.05,
  }));

  const mockProfile = {
    useMetric: false,
    firstName: "John",
  };

  // Helper to render with providers
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<SyncProgressProvider>{ui}</SyncProgressProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProviderLinks).mockReturnValue({ data: mockProviderLinks } as any);
    vi.mocked(useScaleReadingsData).mockReturnValue({
      readings: mockReadings,
      profile: mockProfile,
    });
  });

  it("should render download page with controls", () => {
    renderWithProviders(<Download />);

    expect(screen.getByText("Download Your Data")).toBeInTheDocument();
    expect(screen.getByTestId("view-toggle-buttons")).toBeInTheDocument();
    expect(screen.getByTestId("sort-toggle")).toBeInTheDocument();
    expect(screen.getByText("Download as CSV")).toBeInTheDocument();
  });

  it("should show message when no providers are connected", () => {
    vi.mocked(useProviderLinks).mockReturnValue({ data: [] } as any);

    renderWithProviders(<Download />);

    expect(screen.getByText("Download Your Data")).toBeInTheDocument();
    expect(screen.getByText("No providers connected. Please connect a scale provider from the settings page.")).toBeInTheDocument();
    expect(screen.queryByTestId("view-toggle-buttons")).not.toBeInTheDocument();
  });

  it("should show message when no connected providers have tokens", () => {
    vi.mocked(useProviderLinks).mockReturnValue({
      data: [{ provider: "fitbit", hasToken: false, connectedAt: "2024-01-01T00:00:00Z" }],
    } as any);

    renderWithProviders(<Download />);

    expect(screen.getByText("No providers connected. Please connect a scale provider from the settings page.")).toBeInTheDocument();
  });

  it("should handle view type changes", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Download />);

    // Initially should be computed view
    expect(vi.mocked(useScaleReadingsData)).toHaveBeenCalledWith("computed", true);

    // Click fitbit view
    const fitbitButton = screen.getByText("fitbit");
    await user.click(fitbitButton);

    expect(vi.mocked(useScaleReadingsData)).toHaveBeenCalledWith("fitbit", true);
  });

  it("should update view when changing views", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Download />);

    // Initially should show computed view
    expect(screen.getByTestId("scale-readings-table")).toHaveTextContent("View: computed");

    // Change view
    const fitbitButton = screen.getByText("fitbit");
    await user.click(fitbitButton);

    // Should show fitbit view
    expect(vi.mocked(useScaleReadingsData)).toHaveBeenCalledWith("fitbit", true);
  });

  it("should handle sort toggle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Download />);

    expect(screen.getByText("Sort: Newest First")).toBeInTheDocument();
    expect(vi.mocked(useScaleReadingsData)).toHaveBeenCalledWith("computed", true);

    const sortToggle = screen.getByTestId("sort-toggle");
    await user.click(sortToggle);

    expect(screen.getByText("Sort: Oldest First")).toBeInTheDocument();
    expect(vi.mocked(useScaleReadingsData)).toHaveBeenCalledWith("computed", false);
  });

  it("should handle CSV download", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Download />);

    const downloadButton = screen.getByText("Download as CSV");
    await user.click(downloadButton);

    expect(downloadScaleReadingsCSV).toHaveBeenCalledWith(mockReadings, "computed", false);
  });

  it("should display data table with pagination info", () => {
    renderWithProviders(<Download />);

    const table = screen.getByTestId("scale-readings-table");

    // Should show correct total
    expect(table).toHaveTextContent("Total: 125");

    // Table should show 50 items (first page)
    expect(table).toHaveTextContent("Readings: 50");

    // Should show pagination info when more than 50 items
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("- 125 readings")).toBeInTheDocument();
  });

  it("should show empty state when no readings", () => {
    vi.mocked(useScaleReadingsData).mockReturnValue({
      readings: [],
      profile: mockProfile,
    });

    renderWithProviders(<Download />);

    expect(screen.getByText("No data available for the selected view.")).toBeInTheDocument();
    expect(screen.queryByTestId("scale-readings-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("should pass correct props to ScaleReadingsTable", () => {
    renderWithProviders(<Download />);

    const table = screen.getByTestId("scale-readings-table");
    expect(table).toHaveTextContent("View: computed");
    expect(table).toHaveTextContent("Metric: false");
    expect(table).toHaveTextContent("Readings: 50");
  });

  it("should handle metric units correctly", () => {
    vi.mocked(useScaleReadingsData).mockReturnValue({
      readings: mockReadings,
      profile: { useMetric: true, firstName: "John" },
    });

    renderWithProviders(<Download />);

    const table = screen.getByTestId("scale-readings-table");
    expect(table).toHaveTextContent("Metric: true");
  });

  it("should only show provider buttons for connected providers", () => {
    renderWithProviders(<Download />);

    const viewToggle = screen.getByTestId("view-toggle-buttons");
    expect(viewToggle).toHaveTextContent("Computed");
    expect(viewToggle).toHaveTextContent("fitbit");
    expect(viewToggle).not.toHaveTextContent("withings"); // Not connected
  });

  // Tests from __tests__ version for legacy provider handling
  it("should show download interface when providers are connected", () => {
    vi.mocked(useProviderLinks).mockReturnValue({
      data: [createProviderLink("withings")],
    } as any);

    renderWithProviders(<Download />);

    expect(screen.getByText("Download Your Data")).toBeInTheDocument();
    expect(screen.getByText("Download as CSV")).toBeInTheDocument();
  });

  it("should include enabled legacy provider in the view toggle", () => {
    vi.mocked(useProviderLinks).mockReturnValue({
      data: [createProviderLink("withings"), createProviderLink("legacy", false)],
    } as any);

    renderWithProviders(<Download />);

    const viewToggle = screen.getByTestId("view-toggle-buttons");
    expect(viewToggle).toHaveTextContent("Computed");
    expect(viewToggle).toHaveTextContent("withings");
    expect(viewToggle).toHaveTextContent("legacy");
  });

  it("should exclude disabled legacy provider from the view toggle", () => {
    vi.mocked(useProviderLinks).mockReturnValue({
      data: [createProviderLink("withings"), createProviderLink("legacy", true)],
    } as any);

    renderWithProviders(<Download />);

    const viewToggle = screen.getByTestId("view-toggle-buttons");
    expect(viewToggle).toHaveTextContent("Computed");
    expect(viewToggle).toHaveTextContent("withings");
    expect(viewToggle).not.toHaveTextContent("legacy");
  });

  it("should filter out disabled providers from connected count", () => {
    vi.mocked(useProviderLinks).mockReturnValue({
      data: [createProviderLink("withings", true), createProviderLink("legacy", true)],
    } as any);

    renderWithProviders(<Download />);

    expect(screen.getByText("No providers connected. Please connect a scale provider from the settings page.")).toBeInTheDocument();
  });

  it("should show data when readings are available", () => {
    vi.mocked(useProviderLinks).mockReturnValue({
      data: [createProviderLink("legacy", false)],
    } as any);

    vi.mocked(useScaleReadingsData).mockReturnValue({
      readings: [
        {
          date: LocalDate.parse("2024-01-01"),
          weight: 70,
          provider: "legacy",
        },
      ],
      profile: { useMetric: true },
    } as any);

    renderWithProviders(<Download />);

    expect(screen.getByText("Download as CSV")).toBeInTheDocument();
    expect(screen.queryByText("No data available for the selected view.")).not.toBeInTheDocument();
  });

  it("should show message when no data is available for selected view", () => {
    vi.mocked(useProviderLinks).mockReturnValue({
      data: [createProviderLink("withings")],
    } as any);

    vi.mocked(useScaleReadingsData).mockReturnValue({
      readings: [],
      profile: { useMetric: false },
    } as any);

    renderWithProviders(<Download />);

    expect(screen.getByText("No data available for the selected view.")).toBeInTheDocument();
  });
});
