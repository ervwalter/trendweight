import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocalDate } from "@js-joda/core";
import { useForm } from "react-hook-form";
import { StartDateSettings } from "./start-date-settings";
import type { ProfileData } from "@/lib/core/interfaces";

// Test wrapper component
function TestWrapper({ defaultValues = {} }: { defaultValues?: Partial<ProfileData> }) {
  const { register, control, watch } = useForm<ProfileData>({
    defaultValues,
  });

  return <StartDateSettings register={register} control={control} watch={watch} />;
}

describe("StartDateSettings", () => {
  const today = LocalDate.now().toString();

  it("should render start date input and toggle", () => {
    render(<TestWrapper />);

    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("Earlier weight data")).toBeInTheDocument();
    expect(screen.getByText("Show")).toBeInTheDocument();
    expect(screen.getByText("Hide")).toBeInTheDocument();
  });

  it("should show helper text", () => {
    render(<TestWrapper />);

    expect(screen.getByText("Calculate your total weight change starting from this date.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "'Show' displays all your weight history. 'Hide' only shows data from your start date forward. Either way, your total weight change is calculated from your start date.",
      ),
    ).toBeInTheDocument();
  });

  it("should default to Show when hideDataBeforeStart is not set", () => {
    render(<TestWrapper />);

    const showButton = screen.getByRole("radio", { name: "Show" });
    expect(showButton).toHaveAttribute("data-state", "on");
  });

  it("should show Hide selected when hideDataBeforeStart is true", () => {
    render(<TestWrapper defaultValues={{ hideDataBeforeStart: true }} />);

    const hideButton = screen.getByRole("radio", { name: "Hide" });
    expect(hideButton).toHaveAttribute("data-state", "on");
  });

  it("should handle toggle changes", async () => {
    const user = userEvent.setup();
    render(<TestWrapper defaultValues={{ hideDataBeforeStart: false }} />);

    const hideButton = screen.getByRole("radio", { name: "Hide" });
    await user.click(hideButton);

    expect(hideButton).toHaveAttribute("data-state", "on");
  });

  it("should limit date input to today", () => {
    render(<TestWrapper />);

    const dateInput = screen.getByLabelText("Start Date");
    expect(dateInput).toHaveAttribute("max", today);
  });

  it("uses the local calendar date for the limit, even when UTC has already rolled over", () => {
    vi.stubEnv("TZ", "America/New_York");
    vi.useFakeTimers();
    // 23:30 on March 10 in New York is already March 11 in UTC
    vi.setSystemTime(new Date("2024-03-11T03:30:00Z"));

    try {
      render(<TestWrapper />);

      expect(screen.getByLabelText("Start Date")).toHaveAttribute("max", "2024-03-10");
    } finally {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    }
  });

  it("should display existing start date", () => {
    render(<TestWrapper defaultValues={{ goalStart: "2024-01-01" }} />);

    const dateInput = screen.getByLabelText("Start Date") as HTMLInputElement;
    expect(dateInput.value).toBe("2024-01-01");
  });
});
