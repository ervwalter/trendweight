import { LocalDate } from "@js-joda/core";
import { useForm } from "react-hook-form";
import { useDeleteManualReading, useSaveManualReading } from "@/lib/api/mutations";
import { useManualReadings, useProfile } from "@/lib/api/queries";
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

  const onSubmit = async (values: ManualReadingFormValues) => {
    const reading: ManualReading = {
      date: values.date,
      weight: Math.round(toKg(parseFloat(values.weight), useMetric) * 1000) / 1000,
      fatRatio: values.fatPercent.trim() !== "" ? Math.round((parseFloat(values.fatPercent) / 100) * 10000) / 10000 : undefined,
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
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return "Enter a valid weight";
    const [min, max] = useMetric ? [10, 300] : [20, 660];
    if (parsed < min || parsed > max) return `Weight must be between ${min} and ${max} ${weightUnit}`;
    return true;
  };

  const validateFatPercent = (value: string) => {
    if (value.trim() === "") return true;
    const parsed = parseFloat(value);
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
            autoComplete="off"
            placeholder={useMetric ? "82.5" : "180.5"}
            className="pr-12 text-lg font-semibold tabular-nums md:text-lg"
            {...register("weight", { required: "Weight is required", validate: validateWeight })}
            aria-invalid={!!errors.weight}
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm">{weightUnit}</span>
        </div>
        {errors.weight && <p className="text-destructive mt-1 text-sm">{errors.weight.message}</p>}
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
            autoComplete="off"
            placeholder="22.5"
            className="pr-10 tabular-nums"
            {...register("fatPercent", { validate: validateFatPercent })}
            aria-invalid={!!errors.fatPercent}
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm">%</span>
        </div>
        {errors.fatPercent && <p className="text-destructive mt-1 text-sm">{errors.fatPercent.message}</p>}
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
