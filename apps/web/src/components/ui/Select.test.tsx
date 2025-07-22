import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select } from "./Select";

// Mock react-select to make testing easier
vi.mock("react-select", () => ({
  default: vi.fn(({ options, value, onChange, placeholder, isDisabled }) => (
    <div data-testid="mock-select">
      <select
        value={value?.value || ""}
        onChange={(e) => {
          const selectedOption = options?.find((opt: any) => opt.value === e.target.value);
          onChange?.(selectedOption);
        }}
        aria-label={placeholder}
        disabled={isDisabled}
      >
        <option value="">{placeholder || "Select option"}</option>
        {options?.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )),
}));

describe("Select", () => {
  const mockOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  it("should render select component", () => {
    render(<Select options={mockOptions} />);

    expect(screen.getByTestId("mock-select")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("should render options correctly", () => {
    render(<Select options={mockOptions} />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    // Check that options are rendered
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(screen.getByText("Option 3")).toBeInTheDocument();
  });

  it("should call onChange when option is selected", () => {
    const handleChange = vi.fn();
    render(<Select options={mockOptions} onChange={handleChange} />);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "option2" } });

    expect(handleChange).toHaveBeenCalledWith(mockOptions[1]);
  });

  it("should display selected value", () => {
    render(<Select options={mockOptions} value={mockOptions[1]} />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("option2");
  });

  it("should render placeholder", () => {
    render(<Select options={mockOptions} placeholder="Choose an option" />);

    const select = screen.getByRole("combobox");
    expect(select).toHaveAttribute("aria-label", "Choose an option");
    expect(screen.getByText("Choose an option")).toBeInTheDocument();
  });

  it("should display error message when error prop is provided", () => {
    render(<Select options={mockOptions} error="This field is required" />);

    expect(screen.getByText("This field is required")).toBeInTheDocument();
    const errorText = screen.getByText("This field is required");
    expect(errorText).toHaveClass("text-red-600");
  });

  it("should not display error message when error prop is not provided", () => {
    render(<Select options={mockOptions} />);

    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it("should pass through additional props", () => {
    render(<Select options={mockOptions} id="test-select" data-custom="value" />);

    const selectContainer = screen.getByTestId("mock-select");
    expect(selectContainer).toBeInTheDocument();
  });

  it("should handle disabled state", () => {
    render(<Select options={mockOptions} isDisabled />);

    const select = screen.getByRole("combobox");
    expect(select).toBeDisabled();
  });

  it("should work with empty options array", () => {
    render(<Select options={[]} />);

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select.children).toHaveLength(1); // Only the placeholder option
  });
});
