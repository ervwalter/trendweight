import { LocalDate } from "@js-joda/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProviderLinks } from "@/lib/api/queries";
import type { ProviderLink } from "@/lib/api/types";
import { downloadScaleReadingsCSV } from "@/lib/download/csv-export";
import { useScaleReadingsData } from "@/lib/download/use-scale-readings-data";
import { buildProfileData, buildProviderLink } from "@/test/fixtures";
import { Download } from "./download";
import type { ScaleReading } from "./types";

// Data hooks are replaced so the page can be driven with fixed readings; use-scale-readings-data
// and the query hooks are covered against MSW in their own tests
vi.mock("@/lib/api/queries", () => ({ useProviderLinks: vi.fn() }));
vi.mock("@/lib/download/use-scale-readings-data", () => ({ useScaleReadingsData: vi.fn() }));
vi.mock("@/lib/download/csv-export", () => ({ downloadScaleReadingsCSV: vi.fn() }));

const NO_DATA_MESSAGE = "There's no weight data to download yet. Connect a scale from the settings page, or log a weight to get started.";

// 125 daily computed readings from 2024-01-01 (three pages of 50)
const readings: ScaleReading[] = Array.from({ length: 125 }, (_, i) => ({
  date: LocalDate.of(2024, 1, 1).plusDays(i),
  weight: 180 + i * 0.1,
  trend: 180 + i * 0.05,
  fatRatio: 0.25,
  fatTrend: 0.245,
}));

const imperialProfile = buildProfileData({ useMetric: false });

const useProviderLinksMock = vi.mocked(useProviderLinks);
const useScaleReadingsDataMock = vi.mocked(useScaleReadingsData);

const givenProviders = (...links: ProviderLink[]) => {
  useProviderLinksMock.mockReturnValue({ data: links } as ReturnType<typeof useProviderLinks>);
};

const givenReadings = (data: ScaleReading[], profile = imperialProfile) => {
  useScaleReadingsDataMock.mockReturnValue({ readings: data, profile });
};

const bodyRows = () => {
  const [, body] = within(screen.getByRole("table")).getAllByRole("rowgroup");
  return within(body).getAllByRole("row");
};

const cellTexts = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent);

describe("Download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    givenProviders(buildProviderLink("fitbit"), buildProviderLink("withings", { hasToken: false }));
    givenReadings(readings);
  });

  it("renders the first page of readings with the pagination summary", () => {
    render(<Download />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Download Your Data");
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Date",
      "Actual Weight",
      "Trend Weight",
      "Actual Fat %",
      "Trend Fat %",
    ]);

    const rows = bodyRows();
    expect(rows).toHaveLength(50);
    expect(cellTexts(rows[0])).toEqual(["Jan 1, 2024", "180.0 lb", "180.0 lb", "25.0%", "24.5%"]);
    expect(cellTexts(rows[49])).toEqual(["Feb 19, 2024", "184.9 lb", "182.5 lb", "25.0%", "24.5%"]);

    expect(screen.getByText("125 total readings")).toBeInTheDocument();
    // Pagination is rendered above and below the table
    expect(screen.getAllByText("Page 1 of 3")).toHaveLength(2);
  });

  it("formats readings in kilograms for metric profiles", () => {
    givenReadings(readings, buildProfileData({ useMetric: true }));

    render(<Download />);

    expect(cellTexts(bodyRows()[0])).toEqual(["Jan 1, 2024", "180.0 kg", "180.0 kg", "25.0%", "24.5%"]);
  });

  it("offers a view for each connected provider, in addition to computed values", () => {
    render(<Download />);

    const views = within(screen.getByRole("radiogroup", { name: "View Type" })).getAllByRole("radio");
    expect(views.map((view) => view.textContent)).toEqual(["Computed Values", "Fitbit Data"]);
    expect(views[0]).toBeChecked();
  });

  it("lists an enabled legacy provider last", () => {
    givenProviders(buildProviderLink("legacy"), buildProviderLink("withings"));

    render(<Download />);

    const views = within(screen.getByRole("radiogroup", { name: "View Type" })).getAllByRole("radio");
    expect(views.map((view) => view.textContent)).toEqual(["Computed Values", "Withings Data", "Legacy Data"]);
  });

  it("excludes disabled providers from the views", () => {
    givenProviders(buildProviderLink("withings"), buildProviderLink("legacy", { isDisabled: true }));

    render(<Download />);

    const views = within(screen.getByRole("radiogroup", { name: "View Type" })).getAllByRole("radio");
    expect(views.map((view) => view.textContent)).toEqual(["Computed Values", "Withings Data"]);
  });

  it("requests the selected provider's readings and shows the provider columns", async () => {
    const user = userEvent.setup();
    useScaleReadingsDataMock.mockImplementation((viewType) => ({
      readings:
        viewType === "fitbit" ? [{ date: LocalDate.parse("2024-01-15"), time: "08:30:00", weight: 180.5, fatRatio: 0.25, provider: "fitbit" }] : readings,
      profile: imperialProfile,
    }));
    render(<Download />);

    await user.click(screen.getByRole("radio", { name: "Fitbit Data" }));

    expect(useScaleReadingsDataMock).toHaveBeenLastCalledWith("fitbit", true);
    expect(screen.getByRole("radio", { name: "Fitbit Data" })).toBeChecked();
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Date", "Time", "Weight", "Body Fat %"]);
    expect(cellTexts(bodyRows()[0])).toEqual(["Jan 15, 2024", "8:30 AM", "180.5 lb", "25.0%"]);
  });

  it("requests the readings oldest first when the sort order is toggled", async () => {
    const user = userEvent.setup();
    render(<Download />);

    expect(screen.getByRole("radio", { name: "Newest First" })).toBeChecked();
    expect(useScaleReadingsDataMock).toHaveBeenLastCalledWith("computed", true);

    await user.click(screen.getByRole("radio", { name: "Oldest First" }));

    expect(screen.getByRole("radio", { name: "Oldest First" })).toBeChecked();
    expect(useScaleReadingsDataMock).toHaveBeenLastCalledWith("computed", false);
  });

  it("exports the readings of the current view as CSV", async () => {
    const user = userEvent.setup();
    render(<Download />);

    await user.click(screen.getByRole("button", { name: "Download as CSV" }));
    expect(downloadScaleReadingsCSV).toHaveBeenCalledWith(readings, "computed");

    await user.click(screen.getByRole("radio", { name: "Fitbit Data" }));
    await user.click(screen.getByRole("button", { name: "Download as CSV" }));
    expect(downloadScaleReadingsCSV).toHaveBeenLastCalledWith(readings, "fitbit");
  });

  it("explains when the selected view has no readings", () => {
    givenReadings([]);

    render(<Download />);

    expect(screen.getByText("No data available for the selected view.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download as CSV" })).toBeInTheDocument();
  });

  it("explains that there is nothing to download without a connected provider", () => {
    givenProviders();

    render(<Download />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Download Your Data");
    expect(screen.getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "View Type" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Download as CSV" })).not.toBeInTheDocument();
  });

  it("treats providers without a token or disabled providers as not connected", () => {
    givenProviders(buildProviderLink("fitbit", { hasToken: false }), buildProviderLink("withings", { isDisabled: true }));

    render(<Download />);

    expect(screen.getByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });
});
