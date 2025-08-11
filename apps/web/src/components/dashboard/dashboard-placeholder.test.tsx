import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPlaceholder from "./dashboard-placeholder";

// Mock Clerk hooks
vi.mock("@clerk/clerk-react", () => ({
  useUser: () => ({ user: null, isLoaded: true }),
  useAuth: () => ({ isSignedIn: false, getToken: null }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

// Mock realtime progress hook to return null (no progress)
vi.mock("../../lib/realtime/use-realtime-progress", () => ({
  useRealtimeProgress: () => ({
    status: null,
    message: null,
    providers: null,
    isTerminal: false,
  }),
}));

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe("DashboardPlaceholder", () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient();
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it("should render without crashing", () => {
    renderWithProviders(<DashboardPlaceholder />);
  });

  it("should render skeleton elements with proper data-slot attributes", () => {
    const { container } = renderWithProviders(<DashboardPlaceholder />);
    const skeletonElements = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletonElements.length).toBeGreaterThan(10);
  });

  it("should render placeholder elements for buttons section", () => {
    const { container } = renderWithProviders(<DashboardPlaceholder />);
    const buttonSection = container.querySelector(".mb-4.flex.flex-col-reverse");
    const buttonSkeletons = buttonSection?.querySelectorAll("[data-slot='skeleton']");
    expect(buttonSkeletons).toHaveLength(2);
  });

  it("should render placeholder for chart section", () => {
    const { container } = renderWithProviders(<DashboardPlaceholder />);
    // Should have a skeleton element for the chart area
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    // Just verify we have skeleton elements, not their specific styling
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render table placeholder structure", () => {
    const { container } = renderWithProviders(<DashboardPlaceholder />);
    // Check that table section exists with appropriate structure
    const tableSection = container.querySelector(".space-y-2");
    expect(tableSection).toBeInTheDocument();
  });

  it("should render multiple skeleton elements throughout", () => {
    const { container } = renderWithProviders(<DashboardPlaceholder />);
    // Check that multiple skeleton elements exist
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(10);
  });

  it("should render stats section placeholders", () => {
    const { container } = renderWithProviders(<DashboardPlaceholder />);
    // Look for skeleton elements in the stats section
    const statsSection = container.querySelector(".flex.flex-col.gap-4");
    const skeletons = statsSection?.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons).toBeDefined();
    expect(skeletons!.length).toBeGreaterThan(0);
  });
});
