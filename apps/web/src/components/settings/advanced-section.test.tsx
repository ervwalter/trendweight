import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { AdvancedSection } from "./advanced-section";
import type { ProfileData } from "@/lib/core/interfaces";

// Mock router components
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Test wrapper component
function TestWrapper({ defaultValues = {} }: { defaultValues?: Partial<ProfileData> }) {
  const { register, control, watch, setValue, formState } = useForm<ProfileData>({
    defaultValues,
  });

  return (
    <>
      <AdvancedSection register={register} errors={formState.errors} watch={watch} setValue={setValue} control={control} />
      <div data-testid="form-value">{watch("trendAlgorithm") ?? ""}</div>
      <div data-testid="form-dirty">{formState.isDirty ? "dirty" : "clean"}</div>
    </>
  );
}

describe("AdvancedSection trend algorithm setting", () => {
  it("renders the switch off with no algorithm dropdown by default", () => {
    render(<TestWrapper defaultValues={{ trendAlgorithm: "default" }} />);

    expect(screen.getByText("Use an alternate trend algorithm")).toBeInTheDocument();
    expect(screen.queryByText("Holt (standard)")).not.toBeInTheDocument();
  });

  it("shows concise help copy when off and the full explanation when on", () => {
    render(<TestWrapper defaultValues={{ trendAlgorithm: "default" }} />);

    expect(screen.getByText(/entirely optional and generally not needed/)).toBeInTheDocument();
    expect(screen.queryByText(/The Hacker's Diet argues/)).not.toBeInTheDocument();

    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[switches.length - 1]);

    expect(screen.queryByText(/entirely optional and generally not needed/)).not.toBeInTheDocument();
    expect(screen.getByText(/The Hacker's Diet argues/)).toBeInTheDocument();
  });

  it("treats a missing trendAlgorithm as the default", () => {
    render(<TestWrapper />);

    expect(screen.queryByText("Holt (standard)")).not.toBeInTheDocument();
  });

  it("reveals the dropdown preset to Holt (standard) when toggled on", () => {
    render(<TestWrapper defaultValues={{ trendAlgorithm: "default" }} />);

    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[switches.length - 1]); // trend algorithm switch is the last one

    expect(screen.getByTestId("form-value")).toHaveTextContent("holt");
    expect(screen.getByText("Holt (standard)")).toBeInTheDocument();
    expect(screen.getByTestId("form-dirty")).toHaveTextContent("dirty");
  });

  it("shows the dropdown when a Holt preset is already selected", () => {
    render(<TestWrapper defaultValues={{ trendAlgorithm: "holt-gentle" }} />);

    expect(screen.getByText("Holt (gentle)")).toBeInTheDocument();
  });

  it("reverts to the default when toggled off", () => {
    render(<TestWrapper defaultValues={{ trendAlgorithm: "holt" }} />);

    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[switches.length - 1]);

    expect(screen.getByTestId("form-value")).toHaveTextContent("default");
    expect(screen.queryByText("Holt (standard)")).not.toBeInTheDocument();
  });

  it("links to the math page section", () => {
    render(<TestWrapper defaultValues={{ trendAlgorithm: "default" }} />);

    expect(screen.getByRole("link", { name: /learn more about the math/i })).toBeInTheDocument();
  });
});
