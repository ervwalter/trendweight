import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./toggle";

describe("Toggle", () => {
  it("renders children as an unpressed button", () => {
    render(<Toggle>Toggle me</Toggle>);

    expect(screen.getByRole("button", { name: "Toggle me", pressed: false })).toBeInTheDocument();
  });

  it("reports the pressed state", () => {
    render(<Toggle pressed>Pressed Toggle</Toggle>);

    expect(screen.getByRole("button", { name: "Pressed Toggle", pressed: true })).toBeInTheDocument();
  });

  it("toggles on click and on Space", async () => {
    const handlePressedChange = vi.fn();
    const user = userEvent.setup();
    render(<Toggle onPressedChange={handlePressedChange}>Toggle Button</Toggle>);

    await user.click(screen.getByRole("button"));
    expect(handlePressedChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("button", { pressed: true })).toBeInTheDocument();

    await user.keyboard(" ");
    expect(handlePressedChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("button", { pressed: false })).toBeInTheDocument();
  });

  it("ignores clicks while disabled", async () => {
    const handlePressedChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Toggle disabled onPressedChange={handlePressedChange}>
        Disabled Toggle
      </Toggle>,
    );

    const toggle = screen.getByRole("button");
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(handlePressedChange).not.toHaveBeenCalled();
  });
});
