import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue, Control } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { BasicProfileSettings } from "./BasicProfileSettings";
import { Heading } from "../ui/Heading";

interface ProfileSectionProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  setValue: UseFormSetValue<ProfileData>;
  control: Control<ProfileData>;
}

export function ProfileSection({ register, errors, control }: ProfileSectionProps) {
  return (
    <div className="border-b border-gray-200 p-6">
      <Heading level={2}>Profile Settings</Heading>
      <BasicProfileSettings register={register} errors={errors} control={control} />
    </div>
  );
}
