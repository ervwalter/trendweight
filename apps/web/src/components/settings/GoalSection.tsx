import type { UseFormRegister, FieldErrors, UseFormWatch, Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { Select } from "../ui/Select";
import { Heading } from "../ui/Heading";

interface GoalSectionProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  control: Control<ProfileData>;
}

export function GoalSection({ register, errors, watch, control }: GoalSectionProps) {
  const useMetric = watch("useMetric");
  const weightUnit = useMetric ? "kg" : "lbs";

  // Convert weight plans based on metric setting
  const weightPlans = useMetric
    ? [
        { value: 0, label: "Maintain current weight" },
        { value: -0.25, label: "Lose 0.25 kg per week" },
        { value: -0.5, label: "Lose 0.5 kg per week" },
        { value: -0.75, label: "Lose 0.75 kg per week" },
        { value: -1, label: "Lose 1 kg per week" },
      ]
    : [
        { value: 0, label: "Maintain current weight" },
        { value: -0.5, label: "Lose 1/2 lb per week" },
        { value: -1, label: "Lose 1 lb per week" },
        { value: -1.5, label: "Lose 1 1/2 lbs per week" },
        { value: -2, label: "Lose 2 lbs per week" },
      ];

  return (
    <div className="border-b border-gray-200 p-6">
      <Heading level={2}>Goal Settings</Heading>
      <p className="mb-6 text-sm text-gray-600">
        If you provide some details on your weight loss goals, your dashboard will include statistics on how closely you are following your plan.
      </p>

      <div className="space-y-4">
        <div>
          <label htmlFor="goalStart" className="mb-1 block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            id="goalStart"
            type="date"
            {...register("goalStart")}
            max={new Date().toISOString().split("T")[0]}
            className="focus:ring-brand-500 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none md:w-64"
          />
          <p className="mt-1 text-sm text-gray-500">The baseline date for measuring progress toward your goal.</p>
        </div>

        <div className="mt-6">
          <label htmlFor="goalWeight" className="mb-1 block text-sm font-medium text-gray-700">
            Goal Weight ({weightUnit})
          </label>
          <input
            id="goalWeight"
            type="number"
            step="0.1"
            {...register("goalWeight", {
              valueAsNumber: true,
              min: { value: 0, message: "Goal weight must be positive" },
            })}
            className="focus:ring-brand-500 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:outline-none md:w-32"
          />
          {errors.goalWeight && <p className="mt-1 text-sm text-red-600">{errors.goalWeight.message}</p>}
          <p className="mt-1 text-sm text-gray-500">The weight you are working toward achieving.</p>
        </div>

        <div className="mt-6">
          <label htmlFor="plannedPoundsPerWeek" className="mb-1 block text-sm font-medium text-gray-700">
            My Plan
          </label>
          <div className="w-full md:w-64">
            <Controller
              name="plannedPoundsPerWeek"
              control={control}
              render={({ field }) => (
                <Select<{ value: number; label: string }>
                  value={weightPlans.find((plan) => plan.value === field.value)}
                  onChange={(option) => {
                    field.onChange(option?.value ?? 0);
                  }}
                  options={weightPlans}
                  placeholder="Select a plan..."
                />
              )}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">Your planned rate of weight change. This helps track if you're ahead or behind schedule.</p>
        </div>
      </div>
    </div>
  );
}
