import type { Control, UseFormRegister, UseFormWatch } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { StartDateSettings } from "./StartDateSettings";

interface ProgressTrackingSectionProps {
  register: UseFormRegister<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  control: Control<ProfileData>;
}

export function ProgressTrackingSection({ register, watch, control }: ProgressTrackingSectionProps) {
  return (
    <>
      <CardHeader className="pt-6">
        <CardTitle>Progress Tracking</CardTitle>
        <CardDescription>Track your weight change from a specific starting point and control how your historical data is displayed.</CardDescription>
      </CardHeader>
      <CardContent className="border-b py-6">
        <StartDateSettings register={register} control={control} watch={watch} />
      </CardContent>
    </>
  );
}
