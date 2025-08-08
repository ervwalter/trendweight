import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { ProgressTrackingSection } from "./progress-tracking-section";
import type { ProfileData } from "../../lib/core/interfaces";

// Mock StartDateSettings component
vi.mock("./start-date-settings", () => ({
  StartDateSettings: ({ register }: any) => (
    <div data-testid="start-date-settings">
      <input type="date" {...register("goalStart")} />
      <input type="checkbox" {...register("hideDataBeforeStart")} />
    </div>
  ),
}));

// Test wrapper component
function TestWrapper({ defaultValues = {} }: { defaultValues?: Partial<ProfileData> }) {
  const { register, control, watch } = useForm<ProfileData>({
    defaultValues,
  });

  return <ProgressTrackingSection register={register} watch={watch} control={control} />;
}

describe("ProgressTrackingSection", () => {
  it("should render heading and description", () => {
    render(<TestWrapper />);

    expect(screen.getByText("Progress Tracking")).toBeInTheDocument();
    expect(screen.getByText("Track your weight change from a specific starting point and control how your historical data is displayed.")).toBeInTheDocument();
  });

  it("should render StartDateSettings component", () => {
    render(<TestWrapper />);

    expect(screen.getByTestId("start-date-settings")).toBeInTheDocument();
  });

  it("should pass props to StartDateSettings", () => {
    render(<TestWrapper defaultValues={{ goalStart: "2024-01-01", hideDataBeforeStart: true }} />);

    const dateInput = screen.getByDisplayValue("2024-01-01") as HTMLInputElement;
    expect(dateInput).toHaveAttribute("type", "date");

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox).toBeChecked();
  });
});
