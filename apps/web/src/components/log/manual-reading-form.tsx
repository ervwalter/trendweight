import { ChronoUnit, convert, LocalDate } from "@js-joda/core";
import { useForm } from "react-hook-form";
import { useDeleteManualReading, useSaveManualReading } from "@/lib/api/mutations";
import { useLatestReading, useManualReadings, useProfile } from "@/lib/api/queries";
import type { ManualReading } from "@/lib/api/types";
import { formatWeight } from "@/lib/core/numbers";
import { fromKg, toKg } from "@/lib/core/weight-units";
import { useToast } from "@/lib/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ManualReadingFormValues {
  date: string; // yyyy-MM-dd
  weight: string; // display units
  fatPercent: string; // optional, e.g. "22.5"
}

interface ManualReadingFormProps {
  /** When set, the form edits this reading (prefilled, "Save" semantics) */
  initialReading?: ManualReading;
  /** Called after a successful save */
  onSaved?: () => void;
}

// Mobile keyboards offer a comma key for the decimal separator in many locales
const parseDecimal = (value: string) => parseFloat(value.replace(",", "."));

const lastEntryDateFormatter = new Intl.DateTimeFormat([], { month: "short", day: "numeric" });

function describeDaysAgo(date: string): string {
  const days = ChronoUnit.DAYS.between(LocalDate.parse(date), LocalDate.now());
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

function defaultValuesFor(reading: ManualReading | undefined, useMetric: boolean): ManualReadingFormValues {
  if (reading) {
    return {
      date: reading.date,
      weight: (Math.round(fromKg(reading.weight, useMetric) * 10) / 10).toString(),
      fatPercent: reading.fatRatio !== undefined && reading.fatRatio !== null ? (Math.round(reading.fatRatio * 1000) / 10).toString() : "",
    };
  }
  return {
    date: LocalDate.now().toString(),
    weight: "",
    fatPercent: "",
  };
}

export function ManualReadingForm({ initialReading, onSaved }: ManualReadingFormProps) {
  const { data: profile } = useProfile();
  const { data: readings } = useManualReadings();
  const latestAnySource = useLatestReading();
  const saveReading = useSaveManualReading();
  const deleteReading = useDeleteManualReading();
  const { showToast } = useToast();

  const useMetric = profile?.useMetric ?? false;
  const weightUnit = useMetric ? "kg" : "lbs";
  const today = LocalDate.now().toString();
  const isEdit = !!initialReading;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualReadingFormValues>({
    defaultValues: defaultValuesFor(initialReading, useMetric),
  });

  // One reading per date: saving over an existing date replaces it, so say so up front
  const selectedDate = watch("date");
  const existingForDate = readings.find((r) => r.date === selectedDate && r.date !== initialReading?.date);

  // A reference point for the common case: "what did I weigh last time?" — the newest reading
  // from any source, scale or manual. Computed measurements already merge all sources, but they
  // load without suspending, so the manual log (readings come back newest first) covers the gap.
  // On equal dates the manual log wins — it refreshes immediately after a save, and the
  // backend treats a manual entry as authoritative for its day
  const newerOf = <T extends { date: string }>(fromDashboard: T | undefined, fromManualLog: T | undefined) =>
    fromDashboard && (!fromManualLog || fromDashboard.date > fromManualLog.date) ? fromDashboard : fromManualLog;
  const lastManualWeight = readings[0] ? { date: readings[0].date, weightKg: readings[0].weight } : undefined;
  const lastManualFat = readings.flatMap((r) => (r.fatRatio !== undefined && r.fatRatio !== null ? [{ date: r.date, fatRatio: r.fatRatio }] : []))[0];
  const lastReading = !isEdit ? newerOf(latestAnySource.weight, lastManualWeight) : undefined;
  const lastWeightDisplay = lastReading ? (Math.round(fromKg(lastReading.weightKg, useMetric) * 10) / 10).toString() : undefined;
  const lastFat = !isEdit ? newerOf(latestAnySource.fat, lastManualFat) : undefined;
  const lastFatDisplay = lastFat ? (Math.round(lastFat.fatRatio * 1000) / 10).toString() : undefined;

  const onSubmit = async (values: ManualReadingFormValues) => {
    const reading: ManualReading = {
      date: values.date,
      weight: Math.round(toKg(parseDecimal(values.weight), useMetric) * 1000) / 1000,
      fatRatio: values.fatPercent.trim() !== "" ? Math.round((parseDecimal(values.fatPercent) / 100) * 10000) / 10000 : undefined,
    };

    try {
      await saveReading.mutateAsync(reading);

      // Editing a reading onto a different date is a save + delete of the original
      if (initialReading && initialReading.date !== reading.date) {
        await deleteReading.mutateAsync(initialReading.date);
      }

      showToast({ title: isEdit ? "Entry updated" : "Weight logged", variant: "success" });
      if (!isEdit) {
        reset(defaultValuesFor(undefined, useMetric));
      }
      onSaved?.();
    } catch {
      showToast({ title: "Something went wrong", description: "Your entry could not be saved. Please try again.", variant: "error" });
    }
  };

  const validateWeight = (value: string) => {
    const parsed = parseDecimal(value);
    if (isNaN(parsed)) return "Enter a valid weight";
    const [min, max] = useMetric ? [10, 300] : [20, 660];
    if (parsed < min || parsed > max) return `Weight must be between ${min} and ${max} ${weightUnit}`;
    return true;
  };

  const validateFatPercent = (value: string) => {
    if (value.trim() === "") return true;
    const parsed = parseDecimal(value);
    if (isNaN(parsed)) return "Enter a valid body fat percentage";
    if (parsed < 2 || parsed > 80) return "Body fat must be between 2% and 80%";
    return true;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <div>
        <label htmlFor="reading-weight" className="text-foreground/80 mb-1 block text-sm font-medium">
          Weight ({weightUnit})
        </label>
        <div className="relative">
          <Input
            id="reading-weight"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            placeholder={lastWeightDisplay}
            className="pr-12 text-lg font-semibold tabular-nums md:text-lg"
            {...register("weight", { required: "Weight is required", validate: validateWeight })}
            aria-invalid={!!errors.weight}
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm">{weightUnit}</span>
        </div>
        {errors.weight && <p className="text-destructive mt-1 text-sm">{errors.weight.message}</p>}
        {lastReading && !existingForDate && (
          <p className="text-muted-foreground mt-1 text-sm" suppressHydrationWarning>
            Last weight: {formatWeight(fromKg(lastReading.weightKg, useMetric), useMetric)} &middot;{" "}
            {lastEntryDateFormatter.format(convert(LocalDate.parse(lastReading.date)).toDate())} ({describeDaysAgo(lastReading.date)})
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reading-date" className="text-foreground/80 mb-1 block text-sm font-medium">
          Date
        </label>
        <Input
          id="reading-date"
          type="date"
          max={today}
          {...register("date", {
            required: "Date is required",
            validate: (value) => value <= today || "Date cannot be in the future",
          })}
          aria-invalid={!!errors.date}
        />
        {errors.date && <p className="text-destructive mt-1 text-sm">{errors.date.message}</p>}
      </div>

      <div>
        <label htmlFor="reading-fat" className="text-foreground/80 mb-1 block text-sm font-medium">
          Body Fat <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <div className="relative">
          <Input
            id="reading-fat"
            type="text"
            inputMode="decimal"
            enterKeyHint="done"
            autoComplete="off"
            placeholder={lastFatDisplay}
            className="pr-10 tabular-nums"
            {...register("fatPercent", { validate: validateFatPercent })}
            aria-invalid={!!errors.fatPercent}
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm">%</span>
        </div>
        {errors.fatPercent && <p className="text-destructive mt-1 text-sm">{errors.fatPercent.message}</p>}
      </div>

      {existingForDate && (
        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
          Replaces {selectedDate === today ? "today's" : "the existing"} entry: {formatWeight(fromKg(existingForDate.weight, useMetric), useMetric)}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : existingForDate ? "Replace Entry" : "Log Weight"}
      </Button>
    </form>
  );
}
