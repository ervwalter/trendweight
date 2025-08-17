import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { ProfileData } from "@/lib/core/interfaces";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BasicProfileSettings } from "./basic-profile-settings";

interface ProfileSectionProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  setValue: UseFormSetValue<ProfileData>;
  control: Control<ProfileData>;
  onUnitChange?: (isMetric: boolean) => void;
}

export function ProfileSection({ register, errors, control, onUnitChange }: ProfileSectionProps) {
  return (
    <>
      <CardHeader className="pt-6">
        <CardTitle>Profile Settings</CardTitle>
      </CardHeader>
      <CardContent className="border-b py-6">
        <BasicProfileSettings register={register} errors={errors} control={control} onUnitChange={onUnitChange} />
      </CardContent>
    </>
  );
}
