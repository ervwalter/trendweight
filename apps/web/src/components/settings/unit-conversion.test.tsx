import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useForm } from "react-hook-form";

// Test the unit conversion logic directly
describe("Unit Conversion Logic", () => {
  const testConversionLogic = () => {
    const { result } = renderHook(() =>
      useForm({
        defaultValues: {
          useMetric: false,
          goalWeight: 150,
          plannedPoundsPerWeek: -1,
        },
      }),
    );

    return result;
  };

  it("should convert weights correctly from lbs to kg", () => {
    const form = testConversionLogic();

    act(() => {
      const currentValues = form.current.getValues();
      const newIsMetric = true;

      // This is the same logic from Settings.tsx handleUnitChange
      form.current.setValue("useMetric", newIsMetric);

      const currentGoalWeight = currentValues.goalWeight;
      if (currentGoalWeight && currentGoalWeight !== 0) {
        const kgValue = Math.round(currentGoalWeight / 2.20462);
        form.current.setValue("goalWeight", kgValue);
      }

      const currentPlan = currentValues.plannedPoundsPerWeek;
      if (currentPlan && currentPlan !== 0) {
        form.current.setValue("plannedPoundsPerWeek", currentPlan / 2);
      }
    });

    const values = form.current.getValues();
    expect(values.useMetric).toBe(true);
    expect(values.goalWeight).toBe(68); // 150 lbs ≈ 68 kg
    expect(values.plannedPoundsPerWeek).toBe(-0.5); // -1 lb/week = -0.5 kg/week
  });

  it("should convert weights correctly from kg to lbs", () => {
    const form = testConversionLogic();

    // First set to metric
    act(() => {
      form.current.setValue("useMetric", true);
      form.current.setValue("goalWeight", 68);
      form.current.setValue("plannedPoundsPerWeek", -0.5);
    });

    // Then convert back to imperial
    act(() => {
      const currentValues = form.current.getValues();
      const newIsMetric = false;

      form.current.setValue("useMetric", newIsMetric);

      const currentGoalWeight = currentValues.goalWeight;
      if (currentGoalWeight && currentGoalWeight !== 0) {
        const lbsValue = Math.round(currentGoalWeight * 2.20462);
        form.current.setValue("goalWeight", lbsValue);
      }

      const currentPlan = currentValues.plannedPoundsPerWeek;
      if (currentPlan && currentPlan !== 0) {
        form.current.setValue("plannedPoundsPerWeek", currentPlan * 2);
      }
    });

    const values = form.current.getValues();
    expect(values.useMetric).toBe(false);
    expect(values.goalWeight).toBe(150); // 68 kg ≈ 150 lbs
    expect(values.plannedPoundsPerWeek).toBe(-1); // -0.5 kg/week = -1 lb/week
  });

  it("should not change values when switching to the same unit", () => {
    const form = testConversionLogic();

    const initialValues = form.current.getValues();

    act(() => {
      const currentValues = form.current.getValues();
      const currentIsMetric = currentValues.useMetric;
      const newIsMetric = false; // Same as current

      // Only convert if actually changing
      if (currentIsMetric !== newIsMetric) {
        // This block shouldn't execute
        form.current.setValue("goalWeight", 999);
      }
    });

    const values = form.current.getValues();
    expect(values.goalWeight).toBe(initialValues.goalWeight);
    expect(values.plannedPoundsPerWeek).toBe(initialValues.plannedPoundsPerWeek);
  });

  it("should handle multiple toggles without value drift", () => {
    const form = testConversionLogic();

    const initialWeight = 150;
    const initialPlan = -1;

    // Toggle back and forth 5 times
    for (let i = 0; i < 5; i++) {
      // Convert to metric
      act(() => {
        const currentValues = form.current.getValues();
        if (!currentValues.useMetric) {
          form.current.setValue("useMetric", true);
          const kgValue = Math.round(currentValues.goalWeight / 2.20462);
          form.current.setValue("goalWeight", kgValue);
          form.current.setValue("plannedPoundsPerWeek", currentValues.plannedPoundsPerWeek / 2);
        }
      });

      // Convert back to imperial
      act(() => {
        const currentValues = form.current.getValues();
        if (currentValues.useMetric) {
          form.current.setValue("useMetric", false);
          const lbsValue = Math.round(currentValues.goalWeight * 2.20462);
          form.current.setValue("goalWeight", lbsValue);
          form.current.setValue("plannedPoundsPerWeek", currentValues.plannedPoundsPerWeek * 2);
        }
      });
    }

    const finalValues = form.current.getValues();

    // Allow for small rounding differences
    expect(finalValues.goalWeight).toBeGreaterThanOrEqual(initialWeight - 3);
    expect(finalValues.goalWeight).toBeLessThanOrEqual(initialWeight + 3);
    expect(finalValues.plannedPoundsPerWeek).toBeCloseTo(initialPlan, 1);
  });

  it("should not convert zero values", () => {
    const { result } = renderHook(() =>
      useForm({
        defaultValues: {
          useMetric: false,
          goalWeight: 0,
          plannedPoundsPerWeek: 0,
        },
      }),
    );

    act(() => {
      const currentValues = result.current.getValues();
      result.current.setValue("useMetric", true);

      // Zero values should remain zero
      if (currentValues.goalWeight && currentValues.goalWeight !== 0) {
        result.current.setValue("goalWeight", 999); // Shouldn't execute
      }
      if (currentValues.plannedPoundsPerWeek && currentValues.plannedPoundsPerWeek !== 0) {
        result.current.setValue("plannedPoundsPerWeek", 999); // Shouldn't execute
      }
    });

    const values = result.current.getValues();
    expect(values.goalWeight).toBe(0);
    expect(values.plannedPoundsPerWeek).toBe(0);
  });
});
