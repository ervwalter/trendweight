import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue, Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { Switch } from "../ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { CardContent, CardTitle } from "../ui/card";

interface AdvancedSectionProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  setValue: UseFormSetValue<ProfileData>;
  control: Control<ProfileData>;
}

const dayStartOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const displayHour = hour === 0 ? "Midnight" : hour === 12 ? "Noon" : hour < 12 ? `${hour}:00 am` : `${hour - 12}:00 pm`;
  return { value: hour, label: displayHour };
});

export function AdvancedSection({ control }: AdvancedSectionProps) {
  return (
    <CardContent className="border-b border-gray-200">
      <CardTitle>Advanced Settings</CardTitle>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="dayStartOffset" className="mb-1 block text-sm font-medium text-gray-700">
            Day Start
          </label>
          <Controller
            name="dayStartOffset"
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
                    const numericValue = parseInt(value, 10);
                    field.onChange(numericValue);
                  }}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Select time..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dayStartOptions.map((option) => (
                      <SelectItem key={option.value.toString()} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          />
          <div className="mt-2 space-y-2 text-sm text-gray-600">
            <p>
              TrendWeight uses the first weight reading of each day, and this setting determines the time of day that TrendWeight considers a new day to have
              started.
            </p>
            <p>
              For example, if you set this to 3am and then weigh yourself right before bed at 1am on a Wednesday night, TrendWeight will not count that weight
              reading for Thursday.
            </p>
            <p className="font-medium">If you're not sure what to do with this setting, just leave it set to Midnight.</p>
          </div>
        </div>

        <div className="mt-6">
          <Controller
            name="showCalories"
            control={control}
            render={({ field }) => (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                </div>
                <label htmlFor={field.name} className="cursor-pointer">
                  <div className="text-sm font-medium text-gray-700">Show calorie calculations</div>
                </label>
              </div>
            )}
          />
          <p className="mt-2 text-sm text-gray-600">Display estimated calorie surplus/deficit based on your weight changes.</p>
        </div>
      </div>
    </CardContent>
  );
}
