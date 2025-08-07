import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Migration } from "./Migration";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock the mutation hook
const mockMutate = vi.fn();
const mockCompleteMigration = {
  mutate: mockMutate,
  isPending: false,
};

vi.mock("../../lib/api/mutations", () => ({
  useCompleteMigration: () => mockCompleteMigration,
}));

// Mock UI components
vi.mock("../ui/Heading", () => ({
  Heading: ({ children }: any) => <h1>{children}</h1>,
}));

vi.mock("../ui/Button", () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={`${variant} ${className}`}>
      {children}
    </button>
  ),
}));

describe("Migration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCompleteMigration.isPending = false;
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderMigration = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <Migration />
      </QueryClientProvider>,
    );
  };

  it("should render welcome message and migration info", () => {
    renderMigration();

    expect(screen.getByText("Welcome Back!")).toBeInTheDocument();

    // Check for new version notice (first message)
    expect(screen.getByText(/TrendWeight has been updated with modern code and new features/)).toBeInTheDocument();
    expect(screen.getByText("See what's new")).toBeInTheDocument();

    // Check for migration message
    expect(screen.getByText(/Your account has been migrated from classic TrendWeight/)).toBeInTheDocument();

    // Check for data sync message
    expect(screen.getByText(/Your historical data will sync shortly/)).toBeInTheDocument();

    // Check for contact info message
    expect(screen.getByText(/If you encounter any issues, please don't hesitate to use the contact link/)).toBeInTheDocument();

    expect(screen.getByText("Continue to Dashboard")).toBeInTheDocument();
  });

  it("should handle successful migration completion", async () => {
    const user = userEvent.setup();

    renderMigration();

    const continueButton = screen.getByText("Continue to Dashboard");
    await user.click(continueButton);

    expect(mockMutate).toHaveBeenCalled();

    // Get the onSuccess callback and call it
    const mutateCall = mockMutate.mock.calls[0];
    const options = mutateCall[1];
    options.onSuccess();

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true });
  });

  it("should show loading state while processing", async () => {
    mockCompleteMigration.isPending = true;

    renderMigration();

    const continueButton = screen.getByText("Loading...");
    expect(continueButton).toBeDisabled();
  });

  it("should handle API error gracefully", async () => {
    const user = userEvent.setup();
    mockCompleteMigration.isPending = false;

    renderMigration();

    const continueButton = screen.getByText("Continue to Dashboard");
    await user.click(continueButton);

    expect(mockMutate).toHaveBeenCalled();

    // Get the onError callback and call it
    const mutateCall = mockMutate.mock.calls[0];
    const options = mutateCall[1];
    if (options.onError) {
      options.onError(new Error("Network error"));
    }

    // Navigation should not happen on error
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should call mutation when continue is clicked", async () => {
    const user = userEvent.setup();
    mockCompleteMigration.isPending = false;

    renderMigration();

    const continueButton = screen.getByText("Continue to Dashboard");
    await user.click(continueButton);

    expect(mockMutate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
  });

  it("should use replace navigation to prevent back navigation", async () => {
    const user = userEvent.setup();
    mockCompleteMigration.isPending = false;

    renderMigration();

    const continueButton = screen.getByText("Continue to Dashboard");
    await user.click(continueButton);

    expect(mockMutate).toHaveBeenCalled();

    // Get the onSuccess callback and call it
    const mutateCall = mockMutate.mock.calls[0];
    const options = mutateCall[1];
    options.onSuccess();

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true });
  });

  it("should disable button while mutation is pending", () => {
    mockCompleteMigration.isPending = false;
    const { rerender } = renderMigration();

    const continueButton = screen.getByText("Continue to Dashboard");
    expect(continueButton).not.toBeDisabled();

    // Set isPending to true and re-render
    mockCompleteMigration.isPending = true;
    rerender(
      <QueryClientProvider client={queryClient}>
        <Migration />
      </QueryClientProvider>,
    );

    // Button should be disabled while pending
    const loadingButton = screen.getByText("Loading...");
    expect(loadingButton).toBeDisabled();

    // Reset isPending for next tests
    mockCompleteMigration.isPending = false;
  });

  it("should render in a card container", () => {
    renderMigration();

    const container = screen.getByText("Welcome Back!").closest("[data-slot='card']");
    expect(container).toBeInTheDocument();
  });
});
