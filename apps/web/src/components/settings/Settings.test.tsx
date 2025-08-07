import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Settings } from "./Settings";

// Mock dependencies
const mockNavigationGuard = vi.fn();
vi.mock("../../lib/hooks/useNavigationGuard", () => ({
  useNavigationGuard: (isDirty: boolean) => mockNavigationGuard(isDirty),
}));

// Mock API calls
const mockProfileData = {
  firstName: "John Doe",
  useMetric: false,
  plannedPoundsPerWeek: 1.0,
  goalWeight: 180,
  goalStart: "2024-01-01",
  dayStartOffset: 0,
  showCalories: false,
  sharingEnabled: true,
  sharingToken: "abc123",
};

const mockMutateAsync = vi.fn();
const mockUpdateProfile = {
  mutateAsync: mockMutateAsync,
  isError: false,
  isSuccess: false,
};

vi.mock("../../lib/api/queries", () => ({
  useProfile: () => ({ data: mockProfileData }),
}));

vi.mock("../../lib/api/mutations", () => ({
  useUpdateProfile: () => mockUpdateProfile,
}));

// Mock UI components
vi.mock("../ui/Button", () => ({
  Button: ({ children, onClick, disabled, type, variant }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} data-variant={variant}>
      {children}
    </button>
  ),
}));

// Mock section components
vi.mock("./AdvancedSection", () => ({
  AdvancedSection: ({ register }: any) => (
    <div data-testid="advanced-section">
      <input {...register("showCalories")} type="checkbox" data-testid="show-calories" />
    </div>
  ),
}));

vi.mock("./ConnectedAccountsSection", () => ({
  ConnectedAccountsSection: () => <div data-testid="connected-accounts">Connected Accounts</div>,
}));

vi.mock("./DangerZoneSection", () => ({
  DangerZoneSection: () => <div data-testid="danger-zone">Danger Zone</div>,
}));

vi.mock("./DownloadSection", () => ({
  DownloadSection: () => <div data-testid="download-section">Download Section</div>,
}));

vi.mock("./GoalSection", () => ({
  GoalSection: ({ register }: any) => (
    <div data-testid="goal-section">
      <input {...register("goalWeight", { valueAsNumber: true })} type="number" data-testid="goal-weight" />
      <input {...register("goalStart")} type="date" data-testid="goal-start" />
      <input {...register("plannedPoundsPerWeek", { valueAsNumber: true })} type="number" step="0.1" data-testid="planned-rate" />
    </div>
  ),
}));

vi.mock("./ProfileSection", () => ({
  ProfileSection: ({ register }: any) => (
    <div data-testid="profile-section">
      <input {...register("firstName")} data-testid="first-name" />
      <input
        {...register("useMetric")}
        type="checkbox"
        data-testid="use-metric"
        onChange={(e) => {
          const event = { target: { name: "useMetric", value: e.target.checked } };
          register("useMetric").onChange(event);
        }}
      />
      <button data-testid="unit-lbs" type="button">
        lbs
      </button>
      <button data-testid="unit-kg" type="button">
        kg
      </button>
    </div>
  ),
}));

vi.mock("./SettingsLayout", () => ({
  SettingsLayout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("./SharingSection", () => ({
  SharingSection: () => <div data-testid="sharing-section">Sharing Section</div>,
}));

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.isError = false;
    mockUpdateProfile.isSuccess = false;
    // Mock the response to match what the component expects
    mockMutateAsync.mockResolvedValue({
      user: mockProfileData,
    });
  });

  it("should render all sections", () => {
    render(<Settings />);

    expect(screen.getByTestId("profile-section")).toBeInTheDocument();
    expect(screen.getByTestId("goal-section")).toBeInTheDocument();
    expect(screen.getByTestId("advanced-section")).toBeInTheDocument();
    expect(screen.getByTestId("sharing-section")).toBeInTheDocument();
    expect(screen.getByTestId("connected-accounts")).toBeInTheDocument();
    expect(screen.getByTestId("download-section")).toBeInTheDocument();
    expect(screen.getByTestId("danger-zone")).toBeInTheDocument();
  });

  it("should populate form with settings data", async () => {
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByTestId("first-name")).toHaveValue("John Doe");
      expect(screen.getByTestId("goal-weight")).toHaveValue(180);
      expect(screen.getByTestId("goal-start")).toHaveValue("2024-01-01");
      expect(screen.getByTestId("planned-rate")).toHaveValue(1.0);
    });
  });

  it("should show unsaved changes message when form is dirty", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    const firstNameInput = screen.getByTestId("first-name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane Doe");

    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
  });

  it("should enable save button when form is dirty", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    const saveButton = screen.getByText("Save Settings");
    expect(saveButton).toBeDisabled();

    const firstNameInput = screen.getByTestId("first-name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane Doe");

    expect(saveButton).not.toBeDisabled();
    expect(saveButton).toHaveAttribute("data-variant", "default");
  });

  it("should submit form with updated values", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    const firstNameInput = screen.getByTestId("first-name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane Doe");

    const saveButton = screen.getByText("Save Settings");
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        ...mockProfileData,
        firstName: "Jane Doe",
      });
    });
  });

  it("should trigger unit toggle", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByTestId("goal-weight")).toHaveValue(180);
      expect(screen.getByTestId("planned-rate")).toHaveValue(1.0);
    });

    // Toggle to metric
    const metricCheckbox = screen.getByTestId("use-metric");
    await user.click(metricCheckbox);

    // The checkbox should be checked
    expect(metricCheckbox).toBeChecked();

    // The form should be dirty
    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
  });

  it("should handle metric data", async () => {
    // Start with metric data
    mockProfileData.useMetric = true;
    mockProfileData.goalWeight = 82;
    mockProfileData.plannedPoundsPerWeek = 0.5;

    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByTestId("use-metric")).toBeChecked();
      expect(screen.getByTestId("goal-weight")).toHaveValue(82);
      expect(screen.getByTestId("planned-rate")).toHaveValue(0.5);
    });

    // Reset for other tests
    mockProfileData.useMetric = false;
    mockProfileData.goalWeight = 180;
    mockProfileData.plannedPoundsPerWeek = 1.0;
  });

  it("should handle empty goal values", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    const goalWeightInput = screen.getByTestId("goal-weight");
    await user.clear(goalWeightInput);

    const goalStartInput = screen.getByTestId("goal-start");
    await user.clear(goalStartInput);

    const saveButton = screen.getByText("Save Settings");
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          goalStart: undefined,
          goalWeight: undefined,
        }),
      );
    });
  });

  it("should show error message on save failure", async () => {
    // Suppress expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValue(new Error("Network error"));

    render(<Settings />);

    const firstNameInput = screen.getByTestId("first-name");
    await user.type(firstNameInput, " Updated");

    const saveButton = screen.getByText("Save Settings");
    await user.click(saveButton);

    await waitFor(() => {
      mockUpdateProfile.isError = true;
      render(<Settings />); // Re-render to show error
    });

    expect(screen.getByText("Failed to save settings. Please try again.")).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it("should show success message after saving", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    const firstNameInput = screen.getByTestId("first-name");
    await user.type(firstNameInput, " Updated");

    const saveButton = screen.getByText("Save Settings");
    await user.click(saveButton);

    await waitFor(() => {
      mockUpdateProfile.isSuccess = true;
      render(<Settings />); // Re-render to show success
    });

    expect(screen.getByText("Settings saved successfully!")).toBeInTheDocument();
  });

  it("should disable save button while submitting", async () => {
    const user = userEvent.setup();

    // Create a promise that we can control
    let resolveSubmit: (value: any) => void;
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });
    mockMutateAsync.mockReturnValue(submitPromise);

    render(<Settings />);

    const firstNameInput = screen.getByTestId("first-name");
    await user.type(firstNameInput, " Updated");

    const saveButton = screen.getByText("Save Settings");
    await user.click(saveButton);

    // Button should be disabled and show loading text
    expect(saveButton).toBeDisabled();
    expect(saveButton).toHaveTextContent("Saving...");

    // Resolve the promise with the expected response structure
    resolveSubmit!({ user: mockProfileData });
    await waitFor(() => {
      expect(saveButton).toHaveTextContent("Save Settings");
    });
  });

  it("should call navigation guard with dirty state", async () => {
    const user = userEvent.setup();
    render(<Settings />);

    expect(mockNavigationGuard).toHaveBeenCalledWith(false);

    const firstNameInput = screen.getByTestId("first-name");
    await user.type(firstNameInput, " Updated");

    expect(mockNavigationGuard).toHaveBeenCalledWith(true);
  });

  it("should not convert zero values when toggling units", async () => {
    const user = userEvent.setup();

    // Set goal weight to 0
    mockProfileData.goalWeight = 0;
    mockProfileData.plannedPoundsPerWeek = 0;

    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByTestId("goal-weight")).toHaveValue(0);
      expect(screen.getByTestId("planned-rate")).toHaveValue(0);
    });

    // Toggle to metric
    const metricCheckbox = screen.getByTestId("use-metric");
    await user.click(metricCheckbox);

    // Values should remain 0
    await waitFor(() => {
      expect(screen.getByTestId("goal-weight")).toHaveValue(0);
      expect(screen.getByTestId("planned-rate")).toHaveValue(0);
    });

    // Reset for other tests
    mockProfileData.goalWeight = 180;
    mockProfileData.plannedPoundsPerWeek = 1.0;
  });

  it("should not convert units when clicking the same unit button", async () => {
    const user = userEvent.setup();

    // Start with lbs and specific values
    mockProfileData.useMetric = false;
    mockProfileData.goalWeight = 180;
    mockProfileData.plannedPoundsPerWeek = 1.0;

    render(<Settings />);

    await waitFor(() => {
      expect(screen.getByTestId("goal-weight")).toHaveValue(180);
      expect(screen.getByTestId("planned-rate")).toHaveValue(1.0);
    });

    // Click lbs button again (should not convert)
    const lbsButton = screen.getByTestId("unit-lbs");
    await user.click(lbsButton);

    // Values should remain unchanged (not multiplied by conversion factor)
    await waitFor(() => {
      expect(screen.getByTestId("goal-weight")).toHaveValue(180);
      expect(screen.getByTestId("planned-rate")).toHaveValue(1.0);
    });

    // Reset for other tests
    mockProfileData.useMetric = false;
    mockProfileData.goalWeight = 180;
    mockProfileData.plannedPoundsPerWeek = 1.0;
  });
});
