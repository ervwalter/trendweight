import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

describe("ToggleGroup", () => {
  it("renders children correctly", () => {
    render(
      <ToggleGroup>
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    // Always operates in single mode, buttons have role="radio"
    expect(screen.getByRole("radio", { name: "Option A" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Option B" })).toBeInTheDocument();
  });

  it("handles selection", async () => {
    const handleValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ToggleGroup onValueChange={handleValueChange}>
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    const optionA = screen.getByRole("radio", { name: "Option A" });
    const optionB = screen.getByRole("radio", { name: "Option B" });

    await user.click(optionA);
    expect(handleValueChange).toHaveBeenCalledWith("a");

    await user.click(optionB);
    expect(handleValueChange).toHaveBeenCalledWith("b");
  });

  it("prevents deselection (radio button behavior)", async () => {
    const handleValueChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ToggleGroup onValueChange={handleValueChange} defaultValue="a">
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    const optionA = screen.getByRole("radio", { name: "Option A" });

    // Click the already selected option - should not trigger onValueChange
    await user.click(optionA);
    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it("applies correct styling to items", () => {
    render(
      <ToggleGroup defaultValue="a">
        <ToggleGroupItem value="a">Selected</ToggleGroupItem>
        <ToggleGroupItem value="b">Not Selected</ToggleGroupItem>
      </ToggleGroup>,
    );

    const selected = screen.getByRole("radio", { name: "Selected" });
    const notSelected = screen.getByRole("radio", { name: "Not Selected" });

    expect(selected).toHaveAttribute("data-state", "on");
    expect(notSelected).toHaveAttribute("data-state", "off");
  });

  it("applies rounded corners correctly", () => {
    render(
      <ToggleGroup>
        <ToggleGroupItem value="a">First</ToggleGroupItem>
        <ToggleGroupItem value="b">Middle</ToggleGroupItem>
        <ToggleGroupItem value="c">Last</ToggleGroupItem>
      </ToggleGroup>,
    );

    const first = screen.getByRole("radio", { name: "First" });
    const middle = screen.getByRole("radio", { name: "Middle" });
    const last = screen.getByRole("radio", { name: "Last" });

    expect(first).toHaveClass("first:rounded-l-md");
    expect(last).toHaveClass("last:rounded-r-md");
    expect(middle).toHaveClass("rounded-none");
  });

  it("removes duplicate borders between items", () => {
    render(
      <ToggleGroup>
        <ToggleGroupItem value="a">First</ToggleGroupItem>
        <ToggleGroupItem value="b">Second</ToggleGroupItem>
      </ToggleGroup>,
    );

    const second = screen.getByRole("radio", { name: "Second" });
    expect(second).toHaveClass("[&:not(:first-child)]:-ml-px");
  });

  it("can be disabled", () => {
    render(
      <ToggleGroup disabled>
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    const buttons = screen.getAllByRole("radio");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("inherits variant and size from context", () => {
    render(
      <ToggleGroup variant="outline" size="sm">
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
      </ToggleGroup>,
    );

    const button = screen.getByRole("radio");
    expect(button).toHaveClass("border"); // outline variant
    expect(button).toHaveClass("h-8"); // sm size
  });
});
