import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

describe("ToggleGroup", () => {
  it("renders its items as radio buttons", () => {
    render(
      <ToggleGroup>
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    // Always operates in single mode, so the items behave like radio buttons
    expect(screen.getByRole("radio", { name: "Option A" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Option B" })).not.toBeChecked();
  });

  it("reports the selected value and checks that item", async () => {
    const handleValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ToggleGroup onValueChange={handleValueChange}>
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    await user.click(screen.getByRole("radio", { name: "Option A" }));
    expect(handleValueChange).toHaveBeenLastCalledWith("a");
    expect(screen.getByRole("radio", { name: "Option A" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Option B" }));
    expect(handleValueChange).toHaveBeenLastCalledWith("b");
    expect(screen.getByRole("radio", { name: "Option B" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Option A" })).not.toBeChecked();
  });

  it("does not report a deselection when the selected item is clicked again", async () => {
    const handleValueChange = vi.fn();
    const user = userEvent.setup();
    // Controlled, as the app uses it: without a value change the item stays checked
    render(
      <ToggleGroup onValueChange={handleValueChange} value="a">
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    await user.click(screen.getByRole("radio", { name: "Option A" }));

    expect(handleValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: "Option A" })).toBeChecked();
  });

  it("checks the defaultValue item", () => {
    render(
      <ToggleGroup defaultValue="a">
        <ToggleGroupItem value="a">Selected</ToggleGroupItem>
        <ToggleGroupItem value="b">Not Selected</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole("radio", { name: "Selected" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Not Selected" })).not.toBeChecked();
  });

  it("disables every item when the group is disabled", async () => {
    const handleValueChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ToggleGroup disabled onValueChange={handleValueChange}>
        <ToggleGroupItem value="a">Option A</ToggleGroupItem>
        <ToggleGroupItem value="b">Option B</ToggleGroupItem>
      </ToggleGroup>,
    );

    for (const item of screen.getAllByRole("radio")) {
      expect(item).toBeDisabled();
    }
    await user.click(screen.getByRole("radio", { name: "Option A" }));
    expect(handleValueChange).not.toHaveBeenCalled();
  });
});
