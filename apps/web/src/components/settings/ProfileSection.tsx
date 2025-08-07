import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue, Control } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { BasicProfileSettings } from "./BasicProfileSettings";
import { CardContent, CardTitle } from "../ui/card";

interface ProfileSectionProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  setValue: UseFormSetValue<ProfileData>;
  control: Control<ProfileData>;
}

export function ProfileSection({ register, errors, control }: ProfileSectionProps) {
  return (
    <CardContent className="border-b border-gray-200">
      <CardTitle>Profile Settings</CardTitle>
      <div className="mt-4">
        <BasicProfileSettings register={register} errors={errors} control={control} />
      </div>
    </CardContent>
  );
}
