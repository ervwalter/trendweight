import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { BasicProfileSettings } from "./BasicProfileSettings";
import type { ProfileData } from "../../lib/core/interfaces";

// Test wrapper component
function TestWrapper({ errors = {}, defaultValues = {} }: { errors?: any; defaultValues?: Partial<ProfileData> }) {
  const { register, control } = useForm<ProfileData>({
    defaultValues,
  });

  return <BasicProfileSettings register={register} errors={errors} control={control} />;
}

describe("BasicProfileSettings", () => {
  it("should render first name input", () => {
    render(<TestWrapper />);

    const firstNameInput = screen.getByLabelText("First Name");
    expect(firstNameInput).toBeInTheDocument();
    expect(firstNameInput).toHaveAttribute("type", "text");
    expect(firstNameInput).toHaveAttribute("id", "firstName");
  });

  it("should show helper text", () => {
    render(<TestWrapper />);

    expect(screen.getByText("Used for greetings on the dashboard.")).toBeInTheDocument();
    expect(screen.getByText("Choose your preferred unit of measurement.")).toBeInTheDocument();
  });

  it("should render with default first name value", () => {
    render(
      <TestWrapper
        defaultValues={{
          firstName: "John",
        }}
      />,
    );

    expect(screen.getByLabelText("First Name")).toHaveValue("John");
  });

  it("should show validation error for first name", () => {
    render(
      <TestWrapper
        errors={{
          firstName: { message: "First name is required" },
        }}
      />,
    );

    expect(screen.getByText("First name is required")).toBeInTheDocument();
  });

  it("should allow typing in first name field", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const firstNameInput = screen.getByLabelText("First Name");
    await user.type(firstNameInput, "Jane");

    expect(firstNameInput).toHaveValue("Jane");
  });

  it("should render weight units section", () => {
    render(<TestWrapper />);

    expect(screen.getByText("Weight Units")).toBeInTheDocument();
    expect(screen.getByText("lbs")).toBeInTheDocument();
    expect(screen.getByText("kg")).toBeInTheDocument();
  });
});
