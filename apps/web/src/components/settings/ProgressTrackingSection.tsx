import type { UseFormRegister, UseFormWatch, Control } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { CardContent, CardTitle } from "../ui/card";
import { StartDateSettings } from "./StartDateSettings";

interface ProgressTrackingSectionProps {
  register: UseFormRegister<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  control: Control<ProfileData>;
}

export function ProgressTrackingSection({ register, watch, control }: ProgressTrackingSectionProps) {
  return (
    <CardContent className="border-b border-gray-200">
      <CardTitle>Progress Tracking</CardTitle>
      <p className="mt-2 mb-4 text-sm text-gray-600">
        Track your weight change from a specific starting point and control how your historical data is displayed.
      </p>
      <StartDateSettings register={register} control={control} watch={watch} />
    </CardContent>
  );
}
