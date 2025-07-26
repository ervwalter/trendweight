import type { UseFormRegister, UseFormWatch, Control } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { Heading } from "../ui/Heading";
import { StartDateSettings } from "./StartDateSettings";

interface ProgressTrackingSectionProps {
  register: UseFormRegister<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  control: Control<ProfileData>;
}

export function ProgressTrackingSection({ register, watch, control }: ProgressTrackingSectionProps) {
  return (
    <div className="border-b border-gray-200 p-6">
      <Heading level={2}>Progress Tracking</Heading>
      <p className="mb-6 text-sm text-gray-600">Track your weight change from a specific starting point and control how your historical data is displayed.</p>

      <StartDateSettings register={register} control={control} watch={watch} />
    </div>
  );
}
