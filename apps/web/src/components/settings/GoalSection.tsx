import { useMemo } from "react";
import type { Control, FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface GoalSectionProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  control: Control<ProfileData>;
}

export function GoalSection({ register, errors, watch, control }: GoalSectionProps) {
  const useMetric = watch("useMetric");
  const weightUnit = useMetric ? "kg" : "lbs";

  // Memoize weight plans to prevent new object creation on every render
  const weightPlans = useMemo(
    () =>
      useMetric
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
          ],
    [useMetric],
  );

  return (
    <>
      <CardHeader className="pt-6">
        <CardTitle>Goal Settings</CardTitle>
        <CardDescription>Set a goal weight and plan to track your progress. Your dashboard will show whether you're ahead or behind schedule.</CardDescription>
      </CardHeader>
      <CardContent className="border-b py-6">
        <div>
          <label htmlFor="goalWeight" className="mb-1 block text-sm font-medium text-gray-700">
            Goal Weight ({weightUnit})
          </label>
          <Input
            id="goalWeight"
            type="number"
            step="1"
            {...register("goalWeight", {
              valueAsNumber: true,
              min: { value: 0, message: "Goal weight must be positive" },
            })}
            className="md:w-32"
            aria-invalid={!!errors.goalWeight}
          />
          {errors.goalWeight && <p className="mt-1 text-sm text-red-600">{errors.goalWeight.message}</p>}
          <p className="mt-1 text-sm text-gray-500">The weight you are working toward achieving.</p>
        </div>

        <div className="mt-6">
          <label htmlFor="plannedPoundsPerWeek" className="mb-1 block text-sm font-medium text-gray-700">
            My Plan
          </label>
          <Controller
            name="plannedPoundsPerWeek"
            control={control}
            render={({ field }) => {
              const stringValue = field.value !== undefined && field.value !== null ? field.value.toString() : "";

              return (
                <Select
                  value={stringValue}
                  onValueChange={(value) => {
                    if (value === "") {
                      // Don't trigger onChange for empty values during initialization
                      return;
                    }
                    const numericValue = parseFloat(value);
                    field.onChange(numericValue);
                  }}
                >
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder="Select a plan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {weightPlans.map((plan) => (
                      <SelectItem key={plan.value.toString()} value={plan.value.toString()}>
                        {plan.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          />
          <p className="mt-2 text-sm text-gray-500">Your planned rate of weight change. This helps track if you're ahead or behind schedule.</p>
        </div>
      </CardContent>
    </>
  );
}
