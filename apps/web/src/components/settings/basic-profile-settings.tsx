import type { UseFormRegister, FieldErrors, Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { Input } from "../ui/input";

interface BasicProfileSettingsProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  control: Control<ProfileData>;
  onUnitChange?: (isMetric: boolean) => void;
}

/**
 * Basic profile settings component containing First Name, Time Zone, and Units.
 * Used in both the initial setup flow and the main settings page.
 */
export function BasicProfileSettings({ register, errors, control, onUnitChange }: BasicProfileSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="firstName" className="text-foreground/80 mb-1 block text-sm font-medium">
          First Name
        </label>
        <Input id="firstName" type="text" {...register("firstName", { required: "First name is required" })} aria-invalid={!!errors.firstName} />
        {errors.firstName && <p className="text-destructive mt-1 text-sm">{errors.firstName.message}</p>}
        <p className="text-muted-foreground mt-1 text-sm">Used for greetings on the dashboard.</p>
      </div>

      <div className="mt-6">
        <label className="text-foreground/80 mb-2 block text-sm font-medium">Weight Units</label>
        <Controller
          name="useMetric"
          control={control}
          render={({ field }) => (
            <ToggleGroup
              type="single"
              value={String(field.value ?? false)}
              onValueChange={(value) => {
                const isMetric = value === "true";
                // If we have a custom handler, use it instead of direct onChange
                if (onUnitChange) {
                  onUnitChange(isMetric);
                } else {
                  field.onChange(isMetric);
                }
              }}
              aria-label="Weight Units"
              variant="outline"
            >
              <ToggleGroupItem value="false" data-testid="unit-lbs">
                lbs
              </ToggleGroupItem>
              <ToggleGroupItem value="true" data-testid="unit-kg">
                kg
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        />
        <p className="text-muted-foreground mt-2 text-sm">Choose your preferred unit of measurement.</p>
      </div>
    </div>
  );
}
