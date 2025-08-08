import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("applies custom className", () => {
    render(<Input data-testid="test-input" className="custom-class" />);
    const input = screen.getByTestId("test-input");
    expect(input).toHaveClass("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalled();
  });

  it("handles type prop", () => {
    render(<Input type="email" data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("type", "email");
  });

  it("handles disabled state", () => {
    render(<Input disabled data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toBeDisabled();
  });

  it("handles placeholder text", () => {
    render(<Input placeholder="Enter text" data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("placeholder", "Enter text");
  });

  it("handles value changes", async () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} data-testid="test-input" />);
    const input = screen.getByTestId("test-input");

    const user = userEvent.setup();
    await user.type(input, "test value");

    expect(handleChange).toHaveBeenCalled();
  });

  it("handles required attribute", () => {
    render(<Input required data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("required");
  });

  it("handles aria-invalid for error states", () => {
    render(<Input aria-invalid="true" data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("handles readonly state", () => {
    render(<Input readOnly data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("readonly");
  });

  it("handles number type with step", () => {
    render(<Input type="number" step="0.1" data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("type", "number");
    expect(input).toHaveAttribute("step", "0.1");
  });

  it("handles min and max for number inputs", () => {
    render(<Input type="number" min="0" max="100" data-testid="test-input" />);
    const input = screen.getByTestId("test-input");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "100");
  });
});
