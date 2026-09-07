import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type FieldErrors } from "react-hook-form";
import { GoalSection } from "./goal-section";
import type { ProfileData } from "@/lib/core/interfaces";

const IMPERIAL_PLANS = ["Maintain current weight", "Lose 1/2 lb per week", "Lose 1 lb per week", "Lose 1 1/2 lbs per week", "Lose 2 lbs per week"];
const METRIC_PLANS = ["Maintain current weight", "Lose 0.25 kg per week", "Lose 0.5 kg per week", "Lose 0.75 kg per week", "Lose 1 kg per week"];

interface HarnessProps {
  errors?: FieldErrors<ProfileData>;
  defaultValues?: Partial<ProfileData>;
  onSubmit?: (values: ProfileData) => void;
}

// Hosts the section in a real react-hook-form so submitted values carry the types the form holds
function Harness({ errors = {}, defaultValues = {}, onSubmit = () => {} }: HarnessProps) {
  const { register, control, watch, handleSubmit } = useForm<ProfileData>({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <GoalSection register={register} errors={errors} watch={watch} control={control} />
      <button type="submit">Submit</button>
    </form>
  );
}

// Radix Select opens from the click handler only for non-mouse pointers (the default in
// jsdom), so drive it with fireEvent like ui/select.test.tsx does
async function openPlanSelect() {
  fireEvent.click(screen.getByRole("combobox"));
  await screen.findByRole("listbox");
}

describe("GoalSection", () => {
  // Radix Select scrolls the highlighted option into view; jsdom has no layout
  const scrollIntoView = Element.prototype.scrollIntoView;
  beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
  });
  afterAll(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it("labels the goal weight in pounds and lists the imperial plans", async () => {
    render(<Harness defaultValues={{ useMetric: false }} />);

    expect(screen.getByLabelText("Goal Weight (lbs)")).toBeInTheDocument();

    await openPlanSelect();
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(IMPERIAL_PLANS);
  });

  it("labels the goal weight in kilograms and lists the metric plans", async () => {
    render(<Harness defaultValues={{ useMetric: true }} />);

    expect(screen.getByLabelText("Goal Weight (kg)")).toBeInTheDocument();

    await openPlanSelect();
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(METRIC_PLANS);
  });

  it("shows the label of the current plan", () => {
    render(<Harness defaultValues={{ useMetric: false, plannedPoundsPerWeek: -1.5 }} />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Lose 1 1/2 lbs per week");
  });

  it("shows a placeholder until a plan is chosen", () => {
    render(<Harness />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Select a plan...");
  });

  it("stores the chosen plan as a number", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness defaultValues={{ useMetric: false, plannedPoundsPerWeek: 0 }} onSubmit={onSubmit} />);

    await openPlanSelect();
    fireEvent.click(screen.getByRole("option", { name: "Lose 1 1/2 lbs per week" }));
    expect(screen.getByRole("combobox")).toHaveTextContent("Lose 1 1/2 lbs per week");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].plannedPoundsPerWeek).toBe(-1.5);
  });

  it("stores a typed goal weight as a number", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness defaultValues={{ useMetric: false, goalWeight: 150 }} onSubmit={onSubmit} />);

    const goalWeight = screen.getByLabelText("Goal Weight (lbs)");
    expect(goalWeight).toHaveValue(150);
    await user.clear(goalWeight);
    await user.type(goalWeight, "145.5");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].goalWeight).toBe(145.5);
  });

  it("shows the goal weight validation error", () => {
    render(<Harness errors={{ goalWeight: { type: "min", message: "Goal weight must be positive" } }} />);

    expect(screen.getByText("Goal weight must be positive")).toBeInTheDocument();
    expect(screen.getByLabelText("Goal Weight (lbs)")).toBeInvalid();
  });
});
