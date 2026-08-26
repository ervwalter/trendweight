import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import type { ProfileData } from "@/lib/core/interfaces";
import { TREND_ALGORITHM_DEFAULT, TREND_ALGORITHMS } from "@/lib/core/trend-algorithms";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface AdvancedSectionProps {
  register: UseFormRegister<ProfileData>;
  errors: FieldErrors<ProfileData>;
  watch: UseFormWatch<ProfileData>;
  setValue: UseFormSetValue<ProfileData>;
  control: Control<ProfileData>;
}

const dayStartOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i;
  const displayHour = hour === 0 ? "Midnight" : hour === 12 ? "Noon" : hour < 12 ? `${hour}:00 am` : `${hour - 12}:00 pm`;
  return { value: hour, label: displayHour };
});

export function AdvancedSection({ control, watch, setValue }: AdvancedSectionProps) {
  const trendAlgorithm = watch("trendAlgorithm");
  const alternateTrendOn = !!trendAlgorithm && trendAlgorithm !== TREND_ALGORITHM_DEFAULT;

  return (
    <>
      <CardHeader className="pt-6">
        <CardTitle>Advanced Settings</CardTitle>
      </CardHeader>
      <CardContent className="border-b py-6">
        <div>
          <label htmlFor="dayStartOffset" className="text-foreground/80 mb-1 block text-sm font-medium">
            Day Start
          </label>
          <Controller
            name="dayStartOffset"
            control={control}
            render={({ field }) => {
              const stringValue = field.value !== undefined && field.value !== null ? field.value.toString() : "";

              return (
                <Select
                  value={stringValue}
                  onValueChange={(value) => {
                    if (value === "") {
                      // Don't trigger onChange for empty values during initialization
                      return;
                    }
                    const numericValue = parseInt(value, 10);
                    field.onChange(numericValue);
                  }}
                >
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Select time..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dayStartOptions.map((option) => (
                      <SelectItem key={option.value.toString()} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            }}
          />
          <div className="text-muted-foreground mt-2 space-y-2 text-sm">
            <p>
              TrendWeight uses the first weight reading of each day, and this setting determines the time of day that TrendWeight considers a new day to have
              started.
            </p>
            <p>
              For example, if you set this to 3am and then weigh yourself right before bed at 1am on a Wednesday night, TrendWeight will not count that weight
              reading for Thursday.
            </p>
            <p className="font-medium">If you're not sure what to do with this setting, just leave it set to Midnight.</p>
          </div>
        </div>

        <div className="mt-6">
          <Controller
            name="showCalories"
            control={control}
            render={({ field }) => (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                </div>
                <label htmlFor={field.name} className="cursor-pointer">
                  <div className="text-foreground/80 text-sm font-medium">Show calorie calculations</div>
                </label>
              </div>
            )}
          />
          <p className="text-muted-foreground mt-2 text-sm">Display estimated calorie surplus/deficit based on your weight changes.</p>
        </div>

        <div className="mt-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Switch
                checked={alternateTrendOn}
                onCheckedChange={(checked) => {
                  setValue("trendAlgorithm", checked ? "holt" : TREND_ALGORITHM_DEFAULT, { shouldDirty: true });
                }}
              />
            </div>
            <label className="cursor-pointer">
              <div className="text-foreground/80 text-sm font-medium">Use an alternate trend algorithm</div>
            </label>
          </div>
          {alternateTrendOn && (
            <div className="mt-3">
              <Controller
                name="trendAlgorithm"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue placeholder="Select algorithm..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TREND_ALGORITHMS.filter((a) => !a.isDefault).map((algorithm) => (
                        <SelectItem key={algorithm.id} value={algorithm.id}>
                          {algorithm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
          <div className="text-muted-foreground mt-2 space-y-2 text-sm">
            {alternateTrendOn ? (
              <>
                <p>
                  The default formula deliberately lags behind your actual weight. While you're losing, most daily readings land below the trend line, which The
                  Hacker's Diet argues keeps day-to-day noise motivating instead of discouraging. Alternate algorithms (variants of Holt's linear trend method)
                  follow steady weight loss with less lag, but give up some of that effect. Your actual scale readings are untouched, but the trend line and
                  everything calculated from it — weekly rate, calorie estimates, and goal projections — will change.{" "}
                  <Link to="/math" hash="alternate-trend-algorithms" className="text-link hover:text-link underline">
                    Learn more about the math
                  </Link>
                  .
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {TREND_ALGORITHMS.filter((a) => !a.isDefault).map((algorithm) => (
                    <li key={algorithm.id}>
                      <span className="font-medium">{algorithm.name}:</span> {algorithm.description}
                    </li>
                  ))}
                </ul>
                <p className="font-medium">If you're not sure what to do with this setting, just leave it off.</p>
              </>
            ) : (
              <p>
                TrendWeight can optionally use an alternate formula to calculate your trend line. This is entirely optional and generally not needed — the
                default formula works well for most people.{" "}
                <Link to="/math" hash="alternate-trend-algorithms" className="text-link hover:text-link underline">
                  Learn more about the math
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </>
  );
}
