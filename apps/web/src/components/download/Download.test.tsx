import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Download } from "./Download";
import { LocalDate } from "@js-joda/core";

// Mock dependencies
vi.mock("../../lib/api/queries", () => ({
  useProviderLinks: vi.fn(),
}));

vi.mock("../../lib/download/useScaleReadingsData", () => ({
  useScaleReadingsData: vi.fn(),
}));

vi.mock("../../lib/download/csvExport", () => ({
  downloadScaleReadingsCSV: vi.fn(),
}));

// Mock UI components
vi.mock("../ui/Heading", () => ({
  Heading: ({ children }: any) => <h1>{children}</h1>,
}));

vi.mock("../ui/Button", () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button onClick={onClick} className={`${variant} ${size} ${className}`}>
      {children}
    </button>
  ),
}));

vi.mock("../ui/Pagination", () => ({
  Pagination: ({ currentPage, totalPages, onPageChange, totalItems, itemLabel, className }: any) => (
    <div className={className} data-testid="pagination">
      <span>
        Page {currentPage} of {totalPages}
      </span>
      {totalItems && (
        <span>
          {" "}
          - {totalItems} {itemLabel}
        </span>
      )}
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        Previous
      </button>
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        Next
      </button>
    </div>
  ),
}));

vi.mock("./ScaleReadingsTable", () => ({
  ScaleReadingsTable: ({ readings, viewType, useMetric }: any) => (
    <div data-testid="scale-readings-table">
      <div>View: {viewType}</div>
      <div>Metric: {useMetric ? "true" : "false"}</div>
      <div>Readings: {readings.length}</div>
    </div>
  ),
}));

vi.mock("./ViewToggleButtons", () => ({
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

vi.mock("./SortToggle", () => ({
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
import { useProviderLinks } from "../../lib/api/queries";
import { useScaleReadingsData } from "../../lib/download/useScaleReadingsData";
import { downloadScaleReadingsCSV } from "../../lib/download/csvExport";

describe("Download", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProviderLinks).mockReturnValue({ data: mockProviderLinks } as any);
    vi.mocked(useScaleReadingsData).mockReturnValue({
      readings: mockReadings,
      profile: mockProfile,
    });
  });

  it("should render download page with controls", () => {
    render(<Download />);

    expect(screen.getByText("Download Your Data")).toBeInTheDocument();
    expect(screen.getByTestId("view-toggle-buttons")).toBeInTheDocument();
    expect(screen.getByTestId("sort-toggle")).toBeInTheDocument();
    expect(screen.getByText("Download Icon")).toBeInTheDocument();
    expect(screen.getByText("Download as CSV")).toBeInTheDocument();
  });

  it("should show message when no providers are connected", () => {
    vi.mocked(useProviderLinks).mockReturnValue({ data: [] } as any);

    render(<Download />);

    expect(screen.getByText("Download Your Data")).toBeInTheDocument();
    expect(screen.getByText("No providers connected. Please connect a scale provider from the settings page.")).toBeInTheDocument();
    expect(screen.queryByTestId("view-toggle-buttons")).not.toBeInTheDocument();
  });

  it("should show message when no connected providers have tokens", () => {
    vi.mocked(useProviderLinks).mockReturnValue({
      data: [{ provider: "fitbit", hasToken: false, connectedAt: "2024-01-01T00:00:00Z" }],
    } as any);

    render(<Download />);

    expect(screen.getByText("No providers connected. Please connect a scale provider from the settings page.")).toBeInTheDocument();
  });

  it("should handle view type changes", async () => {
    const user = userEvent.setup();
    render(<Download />);

    // Initially should be computed view
    expect(vi.mocked(useScaleReadingsData)).toHaveBeenCalledWith("computed", true);

    // Click fitbit view
    const fitbitButton = screen.getByText("fitbit");
    await user.click(fitbitButton);

    expect(vi.mocked(useScaleReadingsData)).toHaveBeenCalledWith("fitbit", true);
  });

  it("should reset to page 1 when changing views", async () => {
    const user = userEvent.setup();
    render(<Download />);

    // Go to page 2
    const nextButton = screen.getAllByText("Next")[0];
    await user.click(nextButton);

    expect(screen.getAllByText("Page 2 of 3")[0]).toBeInTheDocument();

    // Change view
    const fitbitButton = screen.getByText("fitbit");
    await user.click(fitbitButton);

    // Should reset to page 1
    expect(screen.getAllByText("Page 1 of 3")[0]).toBeInTheDocument();
  });

  it("should handle sort toggle", async () => {
    const user = userEvent.setup();
    render(<Download />);

    expect(screen.getByText("Sort: Newest First")).toBeInTheDocument();
    expect(vi.mocked(useScaleReadingsData)).toHaveBeenCalledWith("computed", true);

    const sortToggle = screen.getByTestId("sort-toggle");
    await user.click(sortToggle);

    expect(screen.getByText("Sort: Oldest First")).toBeInTheDocument();
    expect(vi.mocked(useScaleReadingsData)).toHaveBeenCalledWith("computed", false);
  });

  it("should handle CSV download", async () => {
    const user = userEvent.setup();
    render(<Download />);

    const downloadButton = screen.getByText("Download as CSV");
    await user.click(downloadButton);

    expect(downloadScaleReadingsCSV).toHaveBeenCalledWith(mockReadings, "computed", false);
  });

  it("should paginate data correctly", () => {
    render(<Download />);

    // Should show pagination info
    expect(screen.getAllByText("Page 1 of 3")[0]).toBeInTheDocument();
    expect(screen.getByText("- 125 readings")).toBeInTheDocument();

    // Table should show 50 items (first page)
    const table = screen.getByTestId("scale-readings-table");
    expect(table).toHaveTextContent("Readings: 50");
  });

  it("should handle page navigation", async () => {
    const user = userEvent.setup();
    render(<Download />);

    // Click next
    const nextButtons = screen.getAllByText("Next");
    await user.click(nextButtons[0]);

    expect(screen.getAllByText("Page 2 of 3")[0]).toBeInTheDocument();

    // Click previous
    const previousButtons = screen.getAllByText("Previous");
    await user.click(previousButtons[0]);

    expect(screen.getAllByText("Page 1 of 3")[0]).toBeInTheDocument();
  });

  it("should show empty state when no readings", () => {
    vi.mocked(useScaleReadingsData).mockReturnValue({
      readings: [],
      profile: mockProfile,
    });

    render(<Download />);

    expect(screen.getByText("No data available for the selected view.")).toBeInTheDocument();
    expect(screen.queryByTestId("scale-readings-table")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("should pass correct props to ScaleReadingsTable", () => {
    render(<Download />);

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

    render(<Download />);

    const table = screen.getByTestId("scale-readings-table");
    expect(table).toHaveTextContent("Metric: true");
  });

  it("should only show provider buttons for connected providers", () => {
    render(<Download />);

    const viewToggle = screen.getByTestId("view-toggle-buttons");
    expect(viewToggle).toHaveTextContent("Computed");
    expect(viewToggle).toHaveTextContent("fitbit");
    expect(viewToggle).not.toHaveTextContent("withings"); // Not connected
  });
});
