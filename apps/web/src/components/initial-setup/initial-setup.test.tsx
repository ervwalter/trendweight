import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { useAuth } from "@/lib/auth/use-auth";
import { authState, TEST_TOKEN, TEST_USER } from "@/test/auth";
import { buildProfileResponse } from "@/test/fixtures";
import { server } from "@/test/mocks/server";
import { json, recordRequests } from "@/test/msw";
import { renderWithProviders } from "@/test/render";
import { InitialSetup } from "./initial-setup";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));
vi.mock("@/lib/auth/use-auth");

const PROFILE_PATH = "/api/profile";

// Like the real hook, return a fresh user object on every call so the component cannot rely on identity
function signInAs(displayName: string) {
  vi.mocked(useAuth).mockImplementation(() => authState({ user: { ...TEST_USER, displayName } }));
}

describe("InitialSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInAs("John Doe Smith");
    server.use(http.put(PROFILE_PATH, () => json(200, buildProfileResponse())));
  });

  it("renders the welcome message and the profile form", () => {
    renderWithProviders(<InitialSetup />);

    expect(screen.getByText("Welcome to TrendWeight!")).toBeInTheDocument();
    expect(screen.getByText("Let's set up your profile to get started.")).toBeInTheDocument();
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Weight Units" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Earlier weight data" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("pre-fills the first name from the signed-in user", async () => {
    renderWithProviders(<InitialSetup />);

    await waitFor(() => expect(screen.getByLabelText("First Name")).toHaveValue("John"));
  });

  it("leaves the first name blank when the user has no display name", () => {
    signInAs("");
    renderWithProviders(<InitialSetup />);

    expect(screen.getByLabelText("First Name")).toHaveValue("");
  });

  it("defaults to imperial units for the en-US locale", () => {
    renderWithProviders(<InitialSetup />);

    expect(screen.getByRole("radio", { name: "lbs" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "kg" })).not.toBeChecked();
  });

  it("creates the profile and replaces the route with the dashboard", async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    renderWithProviders(<InitialSetup />);

    const firstName = screen.getByLabelText("First Name");
    await user.clear(firstName);
    await user.type(firstName, "Jane");
    await user.type(screen.getByLabelText("Start Date"), "2024-01-01");
    await user.click(screen.getByRole("radio", { name: "Hide" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true }));
    const [request] = await recorder.settled();
    expect(request).toMatchObject({
      method: "PUT",
      path: PROFILE_PATH,
      headers: { authorization: `Bearer ${TEST_TOKEN}` },
      body: { firstName: "Jane", useMetric: false, goalStart: "2024-01-01", hideDataBeforeStart: true },
    });
  });

  it("sends metric units when kg is chosen", async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    renderWithProviders(<InitialSetup />);

    await user.click(screen.getByRole("radio", { name: "kg" }));
    expect(screen.getByRole("radio", { name: "kg" })).toBeChecked();
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    // The untouched start date is sent as unset, not as an empty string
    const [request] = await recorder.settled();
    expect(request.body).toEqual({ firstName: "John", useMetric: true, hideDataBeforeStart: false });
  });

  it("disables the button while the profile is being created", async () => {
    const user = userEvent.setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.put(PROFILE_PATH, async () => {
        await gate;
        return json(200, buildProfileResponse());
      }),
    );
    renderWithProviders(<InitialSetup />);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("button", { name: "Creating Profile..." })).toBeDisabled();
    expect(mockNavigate).not.toHaveBeenCalled();

    release();
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
  });

  it("shows the failure message and stays on the page when the API fails", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    server.use(http.put(PROFILE_PATH, () => json(500, { error: "Server exploded" })));
    renderWithProviders(<InitialSetup />);

    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Failed to create profile. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(mockNavigate).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("requires a first name", async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    renderWithProviders(<InitialSetup />);

    const firstName = screen.getByLabelText("First Name");
    await waitFor(() => expect(firstName).toHaveValue("John"));
    await user.clear(firstName);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("First name is required")).toBeInTheDocument();
    expect(firstName).toBeInvalid();
    expect(recorder.calls).toHaveLength(0);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("does not repopulate a cleared first name after a validation error", async () => {
    const user = userEvent.setup();
    renderWithProviders(<InitialSetup />);

    const firstName = screen.getByLabelText("First Name");
    await waitFor(() => expect(firstName).toHaveValue("John"));
    await user.clear(firstName);
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("First name is required")).toBeInTheDocument();
    expect(firstName).toHaveValue("");

    // A later re-render (e.g. Clerk re-emitting the user) must not undo the edit either
    await user.type(firstName, "J");
    await user.clear(firstName);
    expect(firstName).toHaveValue("");
  });
});
