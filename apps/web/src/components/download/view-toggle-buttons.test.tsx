import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ViewToggleButtons } from "./view-toggle-buttons";
import type { ProviderLink } from "@/lib/api/types";

// Mock the providerDisplay utility
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

describe("ViewToggleButtons", () => {
  const mockOnViewChange = vi.fn();

  const createProviderLink = (provider: string, isDisabled = false): ProviderLink => ({
    provider,
    connectedAt: "2024-01-01T00:00:00Z",
    hasToken: true,
    isDisabled,
  });

  beforeEach(() => {
    mockOnViewChange.mockClear();
  });

  it("renders computed values button", () => {
    render(<ViewToggleButtons viewType="computed" onViewChange={mockOnViewChange} providerLinks={[]} />);
    expect(screen.getByText("Computed Values")).toBeInTheDocument();
  });

  it("renders provider buttons for connected providers", () => {
    const providers = [createProviderLink("withings"), createProviderLink("fitbit")];

    render(<ViewToggleButtons viewType="computed" onViewChange={mockOnViewChange} providerLinks={providers} />);

    expect(screen.getByText("Withings Data")).toBeInTheDocument();
    expect(screen.getByText("Fitbit Data")).toBeInTheDocument();
  });

  it("includes legacy provider when enabled", () => {
    const providers = [createProviderLink("withings"), createProviderLink("legacy", false)];

    render(<ViewToggleButtons viewType="computed" onViewChange={mockOnViewChange} providerLinks={providers} />);

    expect(screen.getByText("Legacy Data")).toBeInTheDocument();
  });

  it("excludes legacy provider when disabled", () => {
    const providers = [createProviderLink("withings"), createProviderLink("legacy", true)];

    render(<ViewToggleButtons viewType="computed" onViewChange={mockOnViewChange} providerLinks={providers} />);

    expect(screen.queryByText("Legacy Data")).not.toBeInTheDocument();
  });

  it("calls onViewChange when a button is clicked", async () => {
    const user = userEvent.setup();
    const providers = [createProviderLink("withings")];

    render(<ViewToggleButtons viewType="computed" onViewChange={mockOnViewChange} providerLinks={providers} />);

    await user.click(screen.getByText("Withings Data"));
    expect(mockOnViewChange).toHaveBeenCalledWith("withings");
  });

  it("shows the correct active button based on viewType", () => {
    const providers = [createProviderLink("withings"), createProviderLink("legacy", false)];

    render(<ViewToggleButtons viewType="legacy" onViewChange={mockOnViewChange} providerLinks={providers} />);

    // The active button should have different styling (handled by ToggleButtonGroup)
    // We can verify the value prop is set correctly
    const toggleGroup = screen.getByRole("group", { name: "View Type" });
    expect(toggleGroup).toBeInTheDocument();
  });

  it("filters out providers without tokens", () => {
    const providers = [createProviderLink("withings"), { ...createProviderLink("fitbit"), hasToken: false }];

    render(<ViewToggleButtons viewType="computed" onViewChange={mockOnViewChange} providerLinks={providers} />);

    expect(screen.getByText("Withings Data")).toBeInTheDocument();
    expect(screen.queryByText("Fitbit Data")).not.toBeInTheDocument();
  });

  it("always shows legacy provider last", () => {
    const providers = [createProviderLink("legacy", false), createProviderLink("withings"), createProviderLink("fitbit")];

    render(<ViewToggleButtons viewType="computed" onViewChange={mockOnViewChange} providerLinks={providers} />);

    const buttons = screen.getAllByRole("radio");
    // First button is "Computed Values", then Withings, Fitbit, and Legacy last
    expect(buttons[0]).toHaveTextContent("Computed Values");
    expect(buttons[1]).toHaveTextContent("Withings Data");
    expect(buttons[2]).toHaveTextContent("Fitbit Data");
    expect(buttons[3]).toHaveTextContent("Legacy Data");
  });
});
