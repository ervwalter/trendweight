import { LocalDate } from "@js-joda/core";
import type { Control, FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { ProfileData } from "@/lib/core/interfaces";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";

interface StartDateSettingsProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  control: Control<ProfileData>;
  watch: UseFormWatch<ProfileData>;
}

export function StartDateSettings({ register, errors, control }: StartDateSettingsProps) {
  // The user's local calendar date, not the UTC one; late in the evening west of UTC
  // "today" would otherwise be rejected as a future date
  const today = LocalDate.now().toString();

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="goalStart" className="text-foreground/80 mb-1 block text-sm font-medium">
          Start Date
        </label>
        <Input
          id="goalStart"
          type="date"
          // `max` only constrains the picker; a typed or pasted date still needs the rule
          {...register("goalStart", { validate: (value) => !value || value <= today || "Start date cannot be in the future" })}
          max={today}
          aria-invalid={!!errors.goalStart}
          className="w-auto"
        />
        {errors.goalStart && <p className="text-destructive mt-1 text-sm">{errors.goalStart.message}</p>}
        <p className="text-muted-foreground mt-1 text-sm">Calculate your total weight change starting from this date.</p>
      </div>

      <div>
        <label className="text-foreground/80 mb-1 block text-sm font-medium">Earlier weight data</label>
        <Controller
          name="hideDataBeforeStart"
          control={control}
          render={({ field }) => (
            <ToggleGroup
              type="single"
              value={String(field.value ?? false)}
              onValueChange={(value) => field.onChange(value === "true")}
              aria-label="Earlier weight data"
              variant="outline"
            >
              <ToggleGroupItem value="false">Show</ToggleGroupItem>
              <ToggleGroupItem value="true">Hide</ToggleGroupItem>
            </ToggleGroup>
          )}
        />
        <p className="text-muted-foreground mt-2 text-sm">
          'Show' displays all your weight history. 'Hide' only shows data from your start date forward. Either way, your total weight change is calculated from
          your start date.
        </p>
      </div>
    </div>
  );
}
