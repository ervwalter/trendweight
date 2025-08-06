import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { GoalSection } from "./GoalSection";
import type { ProfileData } from "../../lib/core/interfaces";

// Mock Select component
vi.mock("../ui/select", () => ({
  Select: ({ children, ...props }: any) => (
    <div data-testid="select" {...props}>
      {children}
    </div>
  ),
  SelectContent: ({ children, ...props }: any) => (
    <div data-testid="select-content" {...props}>
      {children}
    </div>
  ),
  SelectGroup: ({ children, ...props }: any) => (
    <div data-testid="select-group" {...props}>
      {children}
    </div>
  ),
  SelectItem: ({ children, value, ...props }: any) => (
    <div data-testid="select-item" data-value={value} {...props}>
      {children}
    </div>
  ),
  SelectLabel: ({ children, ...props }: any) => (
    <div data-testid="select-label" {...props}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, ...props }: any) => (
    <button data-testid="select-trigger" {...props}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder, ...props }: any) => (
    <span data-testid="select-value" {...props}>
      {placeholder}
    </span>
  ),
  SelectScrollUpButton: (props: any) => <button data-testid="select-scroll-up-button" {...props} />,
  SelectScrollDownButton: (props: any) => <button data-testid="select-scroll-down-button" {...props} />,
  SelectSeparator: (props: any) => <div data-testid="select-separator" {...props} />,
}));

// Test wrapper component
function TestWrapper({ errors = {}, defaultValues = {} }: { errors?: any; defaultValues?: Partial<ProfileData> }) {
  const { register, control, watch } = useForm<ProfileData>({
    defaultValues,
  });

  return <GoalSection register={register} errors={errors} watch={watch} control={control} />;
}

describe("GoalSection", () => {
  it("should render all form fields", () => {
    render(<TestWrapper />);

    expect(screen.getByText("Goal Settings")).toBeInTheDocument();
    expect(screen.getByLabelText("Goal Weight (lbs)")).toBeInTheDocument();
    expect(screen.getByText("My Plan")).toBeInTheDocument();
  });

  it("should show description text", () => {
    render(<TestWrapper />);

    expect(screen.getByText(/Set a goal weight and plan to track your progress/)).toBeInTheDocument();
  });

  it("should show helper text for goal fields", () => {
    render(<TestWrapper />);

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
          goalWeight: 150,
          plannedPoundsPerWeek: -1,
        }}
      />,
    );

    expect(screen.getByLabelText("Goal Weight (lbs)")).toHaveValue(150);
    expect(screen.getByTestId("select-trigger")).toBeInTheDocument();
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
