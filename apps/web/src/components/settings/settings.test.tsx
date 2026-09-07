import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { Suspense } from "react";
import { queryKeys } from "@/lib/api/queries";
import type { ProfileData } from "@/lib/core/interfaces";
import { mockAuth, TEST_TOKEN } from "@/test/auth";
import { buildProfileResponse } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json, recordRequests, type Recorded } from "@/test/msw";
import { renderWithProviders } from "@/test/render";
import { Settings } from "./settings";

// Navigation blocking needs a router; the guard's input is what matters here
const mockNavigationGuard = vi.fn();
vi.mock("@/lib/hooks/use-navigation-guard", () => ({
  useNavigationGuard: (isDirty: boolean) => mockNavigationGuard(isDirty),
}));
vi.mock("@/lib/auth/use-auth");

// The sections have their own tests; these stand-ins expose the registered fields
vi.mock("./account-security-section", () => ({
  AccountSecuritySection: () => <div data-testid="account-security">Account Security</div>,
}));

vi.mock("./advanced-section", async () => {
  const { Controller } = await import("react-hook-form");
  return {
    AdvancedSection: ({ control }: any) => (
      <div data-testid="advanced-section">
        <Controller
          name="showCalories"
          control={control}
          render={({ field }) => (
            <input type="checkbox" checked={field.value ?? false} onChange={(event) => field.onChange(event.target.checked)} data-testid="show-calories" />
          )}
        />
      </div>
    ),
  };
});

vi.mock("./connected-accounts-section", () => ({
  ConnectedAccountsSection: () => <div data-testid="connected-accounts">Connected Accounts</div>,
}));

vi.mock("./danger-zone-section", () => ({
  DangerZoneSection: () => <div data-testid="danger-zone">Danger Zone</div>,
}));

vi.mock("./download-section", () => ({
  DownloadSection: () => <div data-testid="download-section">Download Section</div>,
}));

vi.mock("./goal-section", () => ({
  GoalSection: ({ register }: any) => (
    <div data-testid="goal-section">
      <input {...register("goalWeight", { valueAsNumber: true })} type="number" data-testid="goal-weight" />
      <input {...register("goalStart")} type="date" data-testid="goal-start" />
      <input {...register("plannedPoundsPerWeek", { valueAsNumber: true })} type="number" step="0.1" data-testid="planned-rate" />
    </div>
  ),
}));

vi.mock("./profile-section", () => ({
  ProfileSection: ({ register, onUnitChange }: any) => (
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
      <button data-testid="unit-lbs" type="button" onClick={() => onUnitChange(false)}>
        lbs
      </button>
      <button data-testid="unit-kg" type="button" onClick={() => onUnitChange(true)}>
        kg
      </button>
    </div>
  ),
}));

vi.mock("./sharing-section", () => ({
  SharingSection: () => <div data-testid="sharing-section">Sharing Section</div>,
}));

vi.mock("./api-key-section", () => ({
  ApiKeySection: () => <div data-testid="api-key-section">API Key Section</div>,
}));

const PROFILE_PATH = "/api/profile";

const baseProfile: ProfileData = {
  firstName: "John Doe",
  useMetric: false,
  plannedPoundsPerWeek: 1.0,
  goalWeight: 180,
  goalStart: "2024-01-01",
  dayStartOffset: 0,
  showCalories: false,
  hideDataBeforeStart: false,
  trendAlgorithm: "ewma",
  isNewlyMigrated: false,
};

// GET /api/profile serves this profile; PUT echoes the submitted fields back as the saved profile
function givenProfile(overrides: Partial<ProfileData> = {}) {
  const profile = { ...baseProfile, ...overrides };
  server.use(
    http.get(PROFILE_PATH, () => json(200, buildProfileResponse({ user: profile }))),
    http.put(PROFILE_PATH, async ({ request }) => {
      const body = (await request.json()) as Partial<ProfileData>;
      return json(200, buildProfileResponse({ user: { ...profile, ...body } }));
    }),
  );
}

async function renderSettings() {
  const result = renderWithProviders(
    <Suspense fallback={<p>Loading settings...</p>}>
      <Settings />
    </Suspense>,
  );
  await screen.findByTestId("first-name");
  return result;
}

const putCalls = (calls: Recorded[]) => calls.filter((call) => call.method === "PUT" && call.path === PROFILE_PATH);

const saveButton = () => screen.getByRole("button", { name: "Save Settings" });

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    givenProfile();
  });

  it("renders all sections once the profile has loaded", async () => {
    await renderSettings();

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    for (const section of [
      "profile-section",
      "goal-section",
      "advanced-section",
      "sharing-section",
      "connected-accounts",
      "download-section",
      "api-key-section",
      "account-security",
      "danger-zone",
    ]) {
      expect(screen.getByTestId(section)).toBeInTheDocument();
    }
  });

  it("populates the form with the profile", async () => {
    await renderSettings();

    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("John Doe"));
    expect(screen.getByTestId("goal-weight")).toHaveValue(180);
    expect(screen.getByTestId("goal-start")).toHaveValue("2024-01-01");
    expect(screen.getByTestId("planned-rate")).toHaveValue(1.0);
    expect(screen.getByTestId("use-metric")).not.toBeChecked();
    expect(saveButton()).toBeDisabled();
  });

  it("populates metric profiles", async () => {
    givenProfile({ useMetric: true, goalWeight: 82, plannedPoundsPerWeek: 0.5 });
    await renderSettings();

    await waitFor(() => expect(screen.getByTestId("use-metric")).toBeChecked());
    expect(screen.getByTestId("goal-weight")).toHaveValue(82);
    expect(screen.getByTestId("planned-rate")).toHaveValue(0.5);
  });

  it("returns to a clean state when a change is reverted and optional fields are unset", async () => {
    // Regression: with goalStart/goalWeight unset, the empty date input holds "" and the
    // empty valueAsNumber input holds NaN. Unless hydration normalizes the defaults to
    // match, react-hook-form's isDirty deep-compare sticks dirty forever after any edit.
    givenProfile({ goalStart: undefined, goalWeight: undefined });
    const user = userEvent.setup();
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("John Doe"));

    const checkbox = screen.getByTestId("show-calories");
    await user.click(checkbox); // change
    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();

    await user.click(checkbox); // revert
    await waitFor(() => expect(screen.queryByText("You have unsaved changes")).not.toBeInTheDocument());
    expect(saveButton()).toBeDisabled();
  });

  it("shows the unsaved changes message and enables saving when the form is dirty", async () => {
    const user = userEvent.setup();
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("John Doe"));
    expect(saveButton()).toBeDisabled();
    expect(mockNavigationGuard).toHaveBeenLastCalledWith(false);

    const firstNameInput = screen.getByTestId("first-name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane Doe");

    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    expect(mockNavigationGuard).toHaveBeenLastCalledWith(true);
  });

  it("preserves unsaved settings when a background refetch returns a new profile", async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    const { queryClient } = await renderSettings();
    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("John Doe"));

    await user.clear(screen.getByTestId("first-name"));
    await user.type(screen.getByTestId("first-name"), "Unsaved Name");

    givenProfile({ goalWeight: 175 });
    await act(() => queryClient.refetchQueries({ queryKey: queryKeys.profile() }));
    await waitFor(() => expect(queryClient.getQueryState(queryKeys.profile())?.dataUpdateCount).toBe(2));

    expect(screen.getByTestId("first-name")).toHaveValue("Unsaved Name");
    expect(screen.getByTestId("goal-weight")).toHaveValue(180);
    expect(saveButton()).toBeEnabled();
    expect(mockNavigationGuard).toHaveBeenLastCalledWith(true);

    // The draft, not the refetched profile, is what gets saved
    await user.click(saveButton());
    await waitFor(() => expect(putCalls(recorder.calls)).toHaveLength(1));
    const [put] = putCalls(await recorder.settled());
    expect(put.body).toMatchObject({ firstName: "Unsaved Name", goalWeight: 180 });
  });

  it("refreshes pristine settings when a background refetch returns a new profile", async () => {
    const { queryClient } = await renderSettings();
    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("John Doe"));

    givenProfile({ firstName: "Updated Elsewhere" });
    await act(() => queryClient.refetchQueries({ queryKey: queryKeys.profile() }));

    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("Updated Elsewhere"));
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByText("You have unsaved changes")).not.toBeInTheDocument();
  });

  it("saves the updated values and reports success", async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("John Doe"));

    const firstNameInput = screen.getByTestId("first-name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane Doe");
    await user.click(saveButton());

    expect(await screen.findByText("Settings saved successfully!")).toBeInTheDocument();
    expect(screen.queryByText("You have unsaved changes")).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    const [put] = putCalls(await recorder.settled());
    expect(put.headers.authorization).toBe(`Bearer ${TEST_TOKEN}`);
    expect(put.body).toEqual({ ...baseProfile, firstName: "Jane Doe" });
  });

  it("submits cleared goal fields as unset", async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("goal-weight")).toHaveValue(180));

    await user.clear(screen.getByTestId("goal-weight"));
    await user.clear(screen.getByTestId("goal-start"));
    await user.click(saveButton());

    expect(await screen.findByText("Settings saved successfully!")).toBeInTheDocument();
    const [put] = putCalls(await recorder.settled());
    expect(put.body).not.toHaveProperty("goalWeight");
    expect(put.body).not.toHaveProperty("goalStart");
  });

  it("shows an error and keeps the draft when saving fails", async () => {
    // Suppress the expected console.error for this test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    server.use(http.put(PROFILE_PATH, () => json(500, { error: "Server exploded" })));
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("John Doe"));

    await user.type(screen.getByTestId("first-name"), " Updated");
    await user.click(saveButton());

    expect(await screen.findByText("Failed to save settings. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText("Settings saved successfully!")).not.toBeInTheDocument();
    expect(screen.getByTestId("first-name")).toHaveValue("John Doe Updated");
    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();

    consoleErrorSpy.mockRestore();
  });

  it("disables the save button while submitting", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.put(PROFILE_PATH, async () => {
        await gate;
        return json(200, buildProfileResponse({ user: { ...baseProfile, firstName: "John Doe Updated" } }));
      }),
    );
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("John Doe"));

    await user.type(screen.getByTestId("first-name"), " Updated");
    await user.click(saveButton());

    expect(await screen.findByRole("button", { name: "Saving..." })).toBeDisabled();

    release();
    expect(await screen.findByText("Settings saved successfully!")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("marks the form dirty when the unit checkbox is toggled", async () => {
    const user = userEvent.setup();
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("goal-weight")).toHaveValue(180));

    await user.click(screen.getByTestId("use-metric"));

    expect(screen.getByTestId("use-metric")).toBeChecked();
    expect(screen.getByText("You have unsaved changes")).toBeInTheDocument();
  });

  it("shows a zero goal weight as no goal and keeps a zero plan when toggling units", async () => {
    // Older migrated profiles store 0 for "no goal"; 0 is a real "maintain" plan.
    givenProfile({ goalWeight: 0, plannedPoundsPerWeek: 0 });
    const user = userEvent.setup();
    const recorder = recordRequests();
    await renderSettings();

    await waitFor(() => expect(screen.getByTestId("first-name")).toHaveValue("John Doe"));
    expect(screen.getByTestId("goal-weight")).toHaveValue(null);
    expect(screen.getByTestId("planned-rate")).toHaveValue(0);

    await user.click(screen.getByTestId("unit-kg"));

    // The empty goal stays empty and the plan stays 0
    await waitFor(() => expect(screen.getByTestId("use-metric")).toBeChecked());
    expect(screen.getByTestId("goal-weight")).toHaveValue(null);
    expect(screen.getByTestId("planned-rate")).toHaveValue(0);

    // Saving submits the goal as unset rather than 0
    await user.click(saveButton());
    expect(await screen.findByText("Settings saved successfully!")).toBeInTheDocument();
    const [put] = putCalls(await recorder.settled());
    expect(put.body).not.toHaveProperty("goalWeight");
    expect(put.body).toMatchObject({ useMetric: true, plannedPoundsPerWeek: 0 });
  });

  it("converts the goal and plan when switching units", async () => {
    givenProfile({ useMetric: true, goalWeight: 70.5, plannedPoundsPerWeek: -0.5 });
    const user = userEvent.setup();
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("goal-weight")).toHaveValue(70.5));

    await user.click(screen.getByTestId("unit-lbs"));
    await waitFor(() => expect(screen.getByTestId("goal-weight")).toHaveValue(155.4));
    expect(screen.getByTestId("planned-rate")).toHaveValue(-1);
    expect(screen.getByTestId("use-metric")).not.toBeChecked();

    // Round-tripping keeps the decimal
    await user.click(screen.getByTestId("unit-kg"));
    await waitFor(() => expect(screen.getByTestId("goal-weight")).toHaveValue(70.5));
    expect(screen.getByTestId("planned-rate")).toHaveValue(-0.5);
  });

  it("does not convert units when clicking the current unit again", async () => {
    const user = userEvent.setup();
    await renderSettings();
    await waitFor(() => expect(screen.getByTestId("goal-weight")).toHaveValue(180));

    await user.click(screen.getByTestId("unit-lbs"));

    expect(screen.getByTestId("goal-weight")).toHaveValue(180);
    expect(screen.getByTestId("planned-rate")).toHaveValue(1.0);
    expect(screen.queryByText("You have unsaved changes")).not.toBeInTheDocument();
  });
});
