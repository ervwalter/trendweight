import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { GoalSection } from "./GoalSection";
import type { SettingsData } from "../../lib/core/interfaces";

// Mock Select component
vi.mock("../ui/Select", () => ({
  Select: ({ value, onChange, options, placeholder }: any) => (
    <select
      value={value?.value ?? ""}
      onChange={(e) => {
        const selectedValue = Number(e.target.value);
        const option = options.find((opt: any) => opt.value === selectedValue);
        onChange(option);
      }}
      data-testid="select"
    >
      <option value="">{placeholder}</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  ),
}));

// Test wrapper component
function TestWrapper({ errors = {}, defaultValues = {} }: { errors?: any; defaultValues?: Partial<SettingsData> }) {
  const { register, control, watch } = useForm<SettingsData>({
    defaultValues,
  });

  return <GoalSection register={register} errors={errors} watch={watch} control={control} />;
}

describe("GoalSection", () => {
  const today = new Date().toISOString().split("T")[0];

  it("should render all form fields", () => {
    render(<TestWrapper />);

    expect(screen.getByText("Goal Settings")).toBeInTheDocument();
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Goal Weight (lbs)")).toBeInTheDocument();
    expect(screen.getByText("My Plan")).toBeInTheDocument();
  });

  it("should show description text", () => {
    render(<TestWrapper />);

    expect(screen.getByText(/If you provide some details on your weight loss goals/)).toBeInTheDocument();
  });

  it("should show helper text for each field", () => {
    render(<TestWrapper />);

    expect(screen.getByText("The baseline date for measuring progress toward your goal.")).toBeInTheDocument();
    expect(screen.getByText("The weight you are working toward achieving.")).toBeInTheDocument();
    expect(screen.getByText("Your planned rate of weight change. This helps track if you're ahead or behind schedule.")).toBeInTheDocument();
  });

  it("should show metric units when useMetric is true", () => {
    render(<TestWrapper defaultValues={{ useMetric: true }} />);

    expect(screen.getByLabelText("Goal Weight (kg)")).toBeInTheDocument();
  });

  it("should show imperial units when useMetric is false", () => {
    render(<TestWrapper defaultValues={{ useMetric: false }} />);

    expect(screen.getByLabelText("Goal Weight (lbs)")).toBeInTheDocument();
  });

  it("should render with default values", () => {
    render(
      <TestWrapper
        defaultValues={{
          goalStart: "2024-01-01",
          goalWeight: 150,
          plannedPoundsPerWeek: -1,
        }}
      />,
    );

    expect(screen.getByLabelText("Start Date")).toHaveValue("2024-01-01");
    expect(screen.getByLabelText("Goal Weight (lbs)")).toHaveValue(150);
    expect(screen.getByTestId("select")).toHaveValue("-1");
  });

  it("should limit start date to today", () => {
    render(<TestWrapper />);

    const startDateInput = screen.getByLabelText("Start Date");
    expect(startDateInput).toHaveAttribute("max", today);
  });

  it("should show validation error for goal weight", () => {
    render(
      <TestWrapper
        errors={{
          goalWeight: { message: "Goal weight must be positive" },
        }}
      />,
    );

    expect(screen.getByText("Goal weight must be positive")).toBeInTheDocument();
  });

  it("should allow typing in goal weight field", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const goalWeightInput = screen.getByLabelText("Goal Weight (lbs)");
    await user.clear(goalWeightInput);
    await user.type(goalWeightInput, "145.5");

    expect(goalWeightInput).toHaveValue(145.5);
  });

  it("should allow selecting a date", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const startDateInput = screen.getByLabelText("Start Date");
    await user.clear(startDateInput);
    await user.type(startDateInput, "2024-01-15");

    expect(startDateInput).toHaveValue("2024-01-15");
  });

  it("should update units dynamically when useMetric changes", () => {
    // Test with imperial units
    const { unmount } = render(<TestWrapper defaultValues={{ useMetric: false }} />);
    expect(screen.getByLabelText("Goal Weight (lbs)")).toBeInTheDocument();
    unmount();

    // Test with metric units
    render(<TestWrapper defaultValues={{ useMetric: true }} />);
    expect(screen.getByLabelText("Goal Weight (kg)")).toBeInTheDocument();
  });
});
