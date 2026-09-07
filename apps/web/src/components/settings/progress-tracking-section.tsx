import type { Control, FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import type { ProfileData } from "@/lib/core/interfaces";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StartDateSettings } from "./start-date-settings";

interface ProgressTrackingSectionProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  control: Control<ProfileData>;
}

export function ProgressTrackingSection({ register, errors, watch, control }: ProgressTrackingSectionProps) {
  return (
    <>
      <CardHeader className="pt-6">
        <CardTitle>Progress Tracking</CardTitle>
        <CardDescription>Track your weight change from a specific starting point and control how your historical data is displayed.</CardDescription>
      </CardHeader>
      <CardContent className="border-b py-6">
        <StartDateSettings register={register} errors={errors} control={control} watch={watch} />
      </CardContent>
    </>
  );
}
