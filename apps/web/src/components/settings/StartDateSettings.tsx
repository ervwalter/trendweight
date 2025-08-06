import type { Control, UseFormRegister, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { ProfileData } from "../../lib/core/interfaces";
import { ToggleButton } from "../ui/ToggleButton";
import { ToggleButtonGroup } from "../ui/ToggleButtonGroup";
import { Input } from "../ui/input";

interface StartDateSettingsProps {
  register: UseFormRegister<ProfileData>;
  control: Control<ProfileData>;
  watch: UseFormWatch<ProfileData>;
}

export function StartDateSettings({ register, control }: StartDateSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="goalStart" className="mb-1 block text-sm font-medium text-gray-700">
          Start Date
        </label>
        <Input id="goalStart" type="date" {...register("goalStart")} max={new Date().toISOString().split("T")[0]} className="w-auto" />
        <p className="mt-1 text-sm text-gray-500">Calculate your total weight change starting from this date.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Earlier weight data</label>
        <Controller
          name="hideDataBeforeStart"
          control={control}
          render={({ field }) => (
            <ToggleButtonGroup
              value={String(field.value ?? false)}
              onChange={(value) => field.onChange(value === "true")}
              aria-label="Earlier weight data"
              variant="subtle"
            >
              <ToggleButton value="false">Show</ToggleButton>
              <ToggleButton value="true">Hide</ToggleButton>
            </ToggleButtonGroup>
          )}
        />
        <p className="mt-2 text-sm text-gray-500">
          'Show' displays all your weight history. 'Hide' only shows data from your start date forward. Either way, your total weight change is calculated from
          your start date.
        </p>
      </div>
    </div>
  );
}
