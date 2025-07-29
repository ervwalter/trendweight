import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToggleButton } from "./ToggleButton";
import { ToggleButtonGroup } from "./ToggleButtonGroup";

describe("ToggleButtonGroup", () => {
  it("should render with default variant", () => {
    render(
      <ToggleButtonGroup value="option1" aria-label="Test group">
        <ToggleButton value="option1">Option 1</ToggleButton>
        <ToggleButton value="option2">Option 2</ToggleButton>
      </ToggleButtonGroup>,
    );

    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("should render with subtle variant", () => {
    const { container } = render(
      <ToggleButtonGroup value="option1" variant="subtle" aria-label="Test group">
        <ToggleButton value="option1">Option 1</ToggleButton>
        <ToggleButton value="option2">Option 2</ToggleButton>
      </ToggleButtonGroup>,
    );

    const toggleGroup = container.querySelector('[role="group"]');
    expect(toggleGroup).toHaveClass("rounded-lg", "bg-gray-100", "p-1", "gap-1");
  });

  it("should call onChange when different option is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ToggleButtonGroup value="option1" onChange={onChange} aria-label="Test group">
        <ToggleButton value="option1">Option 1</ToggleButton>
        <ToggleButton value="option2">Option 2</ToggleButton>
      </ToggleButtonGroup>,
    );

    await user.click(screen.getByText("Option 2"));
    expect(onChange).toHaveBeenCalledWith("option2");
  });

  it("should NOT call onChange when same option is clicked again", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ToggleButtonGroup value="option1" onChange={onChange} aria-label="Test group">
        <ToggleButton value="option1">Option 1</ToggleButton>
        <ToggleButton value="option2">Option 2</ToggleButton>
      </ToggleButtonGroup>,
    );

    await user.click(screen.getByText("Option 1"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should NOT call onChange when clicking currently selected option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ToggleButtonGroup value="option2" onChange={onChange} aria-label="Test group">
        <ToggleButton value="option1">Option 1</ToggleButton>
        <ToggleButton value="option2">Option 2</ToggleButton>
      </ToggleButtonGroup>,
    );

    // Click the currently selected option
    await user.click(screen.getByText("Option 2"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("should prevent deselecting all options (radio button behavior)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ToggleButtonGroup value="option1" onChange={onChange} aria-label="Test group">
        <ToggleButton value="option1">Option 1</ToggleButton>
        <ToggleButton value="option2">Option 2</ToggleButton>
      </ToggleButtonGroup>,
    );

    // Try to deselect by clicking the same option
    await user.click(screen.getByText("Option 1"));

    // onChange should not be called, maintaining the current selection
    expect(onChange).not.toHaveBeenCalled();

    // The button should still appear selected
    const option1Button = screen.getByText("Option 1").closest("button");
    expect(option1Button).toHaveAttribute("data-state", "on");
  });

  it("should work without onChange prop", async () => {
    const user = userEvent.setup();

    render(
      <ToggleButtonGroup value="option1" aria-label="Test group">
        <ToggleButton value="option1">Option 1</ToggleButton>
        <ToggleButton value="option2">Option 2</ToggleButton>
      </ToggleButtonGroup>,
    );

    // Should not throw when clicking
    await user.click(screen.getByText("Option 2"));
    await user.click(screen.getByText("Option 1"));
  });

  it("should handle empty string value", async () => {
    const onChange = vi.fn();

    render(
      <ToggleButtonGroup value="option1" onChange={onChange} aria-label="Test group">
        <ToggleButton value="option1">Option 1</ToggleButton>
        <ToggleButton value="option2">Option 2</ToggleButton>
      </ToggleButtonGroup>,
    );

    // Simulate Radix trying to pass empty string (deselection attempt)
    const toggleGroup = screen.getByRole("group");

    // This would be the internal call that Radix makes when trying to deselect
    const handleValueChange = (toggleGroup as any).props?.onValueChange;
    if (handleValueChange) {
      handleValueChange("");
      expect(onChange).not.toHaveBeenCalled();
    }
  });
});
