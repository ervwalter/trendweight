import type { UseFormRegister, FieldErrors, Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { ToggleButton } from "../ui/ToggleButton";
import { ToggleButtonGroup } from "../ui/ToggleButtonGroup";
import { Input } from "../ui/input";

interface BasicProfileSettingsProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  control: Control<ProfileData>;
}

/**
 * Basic profile settings component containing First Name, Time Zone, and Units.
 * Used in both the initial setup flow and the main settings page.
 */
export function BasicProfileSettings({ register, errors, control }: BasicProfileSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
          First Name
        </label>
        <Input id="firstName" type="text" {...register("firstName", { required: "First name is required" })} aria-invalid={!!errors.firstName} />
        {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
        <p className="mt-1 text-sm text-gray-500">Used for greetings on the dashboard.</p>
      </div>

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">Weight Units</label>
        <Controller
          name="useMetric"
          control={control}
          render={({ field }) => (
            <ToggleButtonGroup
              value={String(field.value ?? false)}
              onChange={(value) => field.onChange(value === "true")}
              aria-label="Weight Units"
              variant="subtle"
            >
              <ToggleButton value="false" data-testid="unit-lbs">
                lbs
              </ToggleButton>
              <ToggleButton value="true" data-testid="unit-kg">
                kg
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        />
        <p className="mt-2 text-sm text-gray-500">Choose your preferred unit of measurement.</p>
      </div>
    </div>
  );
}
