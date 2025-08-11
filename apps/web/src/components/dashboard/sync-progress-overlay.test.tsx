import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SyncProgressOverlay } from "./sync-progress-overlay";

// Mock the useRealtimeProgress hook
const mockUseRealtimeProgress = vi.fn();
vi.mock("../../lib/realtime/use-realtime-progress", () => ({
  useRealtimeProgress: (id: string) => mockUseRealtimeProgress(id),
}));

// Mock the useMeasurements query
const mockUseMeasurements = vi.fn();
vi.mock("../../lib/api/queries", () => ({
  useMeasurements: () => mockUseMeasurements(),
  queryKeys: {
    data: (sharingCode?: string) => ["data", sharingCode],
  },
}));

describe("SyncProgressOverlay", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a new QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default mock implementations
    mockUseRealtimeProgress.mockReturnValue({
      status: null,
      message: null,
      providers: null,
      isTerminal: false,
    });
    mockUseMeasurements.mockReturnValue({
      isFetching: false,
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
  };

  it("should not render when no progress and not fetching", () => {
    const { container } = renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    expect(container.firstChild).toBeNull();
  });

  it("should not render when React Query is fetching but no providers", () => {
    // The component only renders when providers are present
    mockUseMeasurements.mockReturnValue({
      isFetching: true,
    });
    mockUseRealtimeProgress.mockReturnValue({
      status: null,
      message: null,
      providers: [], // Empty providers
      isTerminal: false,
    });

    const { container } = renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    expect(container.firstChild).toBeNull();
  });

  it("should render progress updates from realtime", () => {
    mockUseRealtimeProgress.mockReturnValue({
      status: "running",
      message: "Syncing your weight data...",
      providers: [{ provider: "fitbit", stage: "fetching", message: null, current: 1, total: 1 }],
      isTerminal: false,
    });

    renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    expect(screen.getByText("Syncing your weight data...")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("should display provider-specific progress", () => {
    mockUseRealtimeProgress.mockReturnValue({
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
      isTerminal: false,
    });

    renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    expect(screen.getByText("Fetching data from providers...")).toBeInTheDocument();
    expect(screen.getByText("Fitbit: Processing chunk 3 of 8")).toBeInTheDocument();
    expect(screen.getByText("Withings: Fetching page 2")).toBeInTheDocument();
  });

  it("should handle year-based messages for Withings", () => {
    mockUseRealtimeProgress.mockReturnValue({
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
      isTerminal: false,
    });

    renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    expect(screen.getByText("Withings: Fetching 2022 data")).toBeInTheDocument();
  });

  it("should not render overlay after terminal state", () => {
    mockUseRealtimeProgress.mockReturnValue({
      status: "succeeded",
      message: "Sync completed",
      providers: null,
      isTerminal: true,
    });

    const { container } = renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    expect(container.firstChild).toBeNull();
  });

  it("should apply custom className", () => {
    mockUseMeasurements.mockReturnValue({
      isFetching: true,
    });

    const { container } = renderWithProviders(<SyncProgressOverlay progressId="test-id" className="custom-class" />);

    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass("custom-class");
  });

  it("should handle shared dashboard with sharingCode", () => {
    mockUseMeasurements.mockReturnValue({
      isFetching: true,
    });

    renderWithProviders(<SyncProgressOverlay progressId="test-id" sharingCode="demo" />);

    expect(screen.getByText("Loading measurements...")).toBeInTheDocument();
  });

  it("should calculate progress percentage correctly", () => {
    mockUseRealtimeProgress.mockReturnValue({
      status: "running",
      message: "Syncing...",
      providers: [
        { provider: "fitbit", stage: "fetching", current: 4, total: 8 }, // 50%
        { provider: "withings", stage: "fetching", current: 3, total: 6 }, // 50%
      ],
      isTerminal: false,
    });

    renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    const progressBar = screen.getByRole("progressbar");
    // Progress component sets aria-valuenow
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
  });

  it("should handle mixed provider progress states", () => {
    mockUseRealtimeProgress.mockReturnValue({
      status: "running",
      message: "Syncing...",
      providers: [
        { provider: "fitbit", stage: "completed", current: 8, total: 8 }, // 100%
        { provider: "withings", stage: "fetching", current: 2, total: 10 }, // 20%
      ],
      isTerminal: false,
    });

    renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    const progressBar = screen.getByRole("progressbar");
    // Average of 100% and 20% = 60%
    expect(progressBar).toHaveAttribute("aria-valuenow", "60");
  });

  it("should show indeterminate progress when no numeric progress available", () => {
    mockUseRealtimeProgress.mockReturnValue({
      status: "running",
      message: "Starting sync...",
      providers: [],
      isTerminal: false,
    });

    renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    const progressBar = screen.getByRole("progressbar");
    // When value is null/undefined, Progress component shows indeterminate state
    expect(progressBar).not.toHaveAttribute("aria-valuenow");
  });

  it("should have proper accessibility attributes", () => {
    mockUseRealtimeProgress.mockReturnValue({
      status: "running",
      message: "Syncing your data...",
      providers: null,
      isTerminal: false,
    });

    renderWithProviders(<SyncProgressOverlay progressId="test-id" />);

    const message = screen.getByText("Syncing your data...");
    expect(message).toHaveAttribute("aria-live", "polite");

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });
});
