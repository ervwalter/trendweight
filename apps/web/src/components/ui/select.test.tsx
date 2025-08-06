import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

// Test component that uses the shadcn Select
function TestSelect({
  options,
  value,
  onValueChange,
  placeholder,
  disabled,
}: {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  const mockOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  it("should render select trigger", () => {
    render(<TestSelect options={mockOptions} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should show placeholder when no value is selected", () => {
    render(<TestSelect options={mockOptions} placeholder="Choose an option" />);

    expect(screen.getByText("Choose an option")).toBeInTheDocument();
  });

  it("should display selected value", () => {
    render(<TestSelect options={mockOptions} value="option2" />);

    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("should call onValueChange when option is selected", async () => {
    const handleChange = vi.fn();
    render(<TestSelect options={mockOptions} onValueChange={handleChange} />);

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // Find the option and click it
    const option = screen.getByText("Option 2");
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith("option2");
  });

  it("should handle disabled state", () => {
    render(<TestSelect options={mockOptions} disabled />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeDisabled();
  });

  it("should work with empty options array", () => {
    render(<TestSelect options={[]} />);

    const trigger = screen.getByRole("combobox");
    expect(trigger).toBeInTheDocument();
  });
});
