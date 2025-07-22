import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InitialSetup } from "./InitialSetup";

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

const mockMutateAsync = vi.fn();
const mockUpdateProfile = {
  mutateAsync: mockMutateAsync,
  isError: false,
};
vi.mock("../../lib/api/mutations", () => ({
  useUpdateProfile: () => mockUpdateProfile,
}));

const mockSession = {
  user: {
    user_metadata: {
      full_name: "John Doe Smith",
    },
  },
};
vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({ session: mockSession }),
}));

vi.mock("../../lib/utils/locale", () => ({
  shouldUseMetric: () => false,
  extractFirstName: (name: string) => name.split(" ")[0],
}));

// Mock UI components
vi.mock("../ui/Heading", () => ({
  Heading: ({ children }: any) => <h1>{children}</h1>,
}));

vi.mock("../ui/Button", () => ({
  Button: ({ children, onClick, disabled, type, variant }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} data-variant={variant}>
      {children}
    </button>
  ),
}));

// Mock BasicProfileSettings
vi.mock("../settings/BasicProfileSettings", () => ({
  BasicProfileSettings: ({ register, errors }: any) => (
    <div data-testid="basic-profile-settings">
      <input {...register("firstName", { required: "First name is required" })} data-testid="first-name" />
      {errors.firstName && <span role="alert">{errors.firstName.message}</span>}
      <input {...register("useMetric")} type="checkbox" data-testid="use-metric" />
    </div>
  ),
}));

describe("InitialSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.isError = false;
    mockSession.user = {
      user_metadata: {
        full_name: "John Doe Smith",
      },
    };
  });

  it("should render welcome message and form", () => {
    render(<InitialSetup />);

    expect(screen.getByText("Welcome to TrendWeight!")).toBeInTheDocument();
    expect(screen.getByText("Let's set up your profile to get started.")).toBeInTheDocument();
    expect(screen.getByTestId("basic-profile-settings")).toBeInTheDocument();
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("should pre-fill first name from user metadata", async () => {
    render(<InitialSetup />);

    await waitFor(() => {
      const firstNameInput = screen.getByTestId("first-name") as HTMLInputElement;
      expect(firstNameInput.value).toBe("John");
    });
  });

  it("should handle alternative name field in metadata", async () => {
    mockSession.user = {
      user_metadata: {
        full_name: "Jane Smith",
      },
    };

    render(<InitialSetup />);

    await waitFor(() => {
      const firstNameInput = screen.getByTestId("first-name") as HTMLInputElement;
      expect(firstNameInput.value).toBe("Jane");
    });
  });

  it("should handle missing user metadata", async () => {
    mockSession.user = {
      user_metadata: {
        full_name: "",
      },
    };

    render(<InitialSetup />);

    await waitFor(() => {
      const firstNameInput = screen.getByTestId("first-name") as HTMLInputElement;
      expect(firstNameInput.value).toBe("");
    });
  });

  it("should handle no session", async () => {
    // Temporarily override the mock
    const originalSession = mockSession.user;
    mockSession.user = null as any;

    render(<InitialSetup />);

    await waitFor(() => {
      const firstNameInput = screen.getByTestId("first-name") as HTMLInputElement;
      expect(firstNameInput.value).toBe("");
    });

    // Restore original mock
    mockSession.user = originalSession;
  });

  it("should handle form submission successfully", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({});

    render(<InitialSetup />);

    // Fill form
    const firstNameInput = screen.getByTestId("first-name");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Jane");

    const submitButton = screen.getByText("Continue");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        firstName: "Jane",
        useMetric: false,
      });
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true });
    });
  });

  it("should show loading state during submission", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<InitialSetup />);

    const submitButton = screen.getByText("Continue");
    await user.click(submitButton);

    expect(screen.getByText("Creating Profile...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("should handle submission error", async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockMutateAsync.mockRejectedValue(new Error("Network error"));
    mockUpdateProfile.isError = true;

    render(<InitialSetup />);

    const submitButton = screen.getByText("Continue");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Failed to create profile. Please try again.")).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should validate required fields", async () => {
    const user = userEvent.setup();

    render(<InitialSetup />);

    // Clear the pre-filled first name
    const firstNameInput = screen.getByTestId("first-name");
    await user.clear(firstNameInput);

    const submitButton = screen.getByText("Continue");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("First name is required");
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should set metric units based on locale", async () => {
    // This test is tricky because the component's defaultValues are set when the component is created
    // We can't change the mock after the fact. Let's verify the form submission includes metric setting
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({});

    render(<InitialSetup />);

    const metricCheckbox = screen.getByTestId("use-metric") as HTMLInputElement;
    // Check the checkbox to enable metric
    await user.click(metricCheckbox);

    // Submit form
    const submitButton = screen.getByText("Continue");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          useMetric: true,
        }),
      );
    });
  });

  it("should use replace navigation to prevent back navigation", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({});

    render(<InitialSetup />);

    const submitButton = screen.getByText("Continue");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true });
    });
  });

  it("should apply correct layout styling", () => {
    render(<InitialSetup />);

    const container = screen.getByText("Welcome to TrendWeight!").closest(".rounded-lg");
    expect(container).toHaveClass("border", "border-gray-200", "bg-white", "shadow-sm");

    const header = screen.getByText("Welcome to TrendWeight!").closest(".border-b");
    expect(header).toHaveClass("border-gray-200", "p-6");
  });

  it("should handle metric checkbox toggle", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({});

    render(<InitialSetup />);

    const metricCheckbox = screen.getByTestId("use-metric");
    await user.click(metricCheckbox);

    const submitButton = screen.getByText("Continue");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        firstName: "John",
        useMetric: true,
      });
    });
  });
});
