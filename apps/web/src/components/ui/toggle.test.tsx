import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toggle } from "./toggle";

describe("Toggle", () => {
  it("renders children correctly", () => {
    render(<Toggle>Toggle me</Toggle>);
    expect(screen.getByRole("button", { name: "Toggle me" })).toBeInTheDocument();
  });

  it("applies default variant and size styles", () => {
    render(<Toggle>Default Toggle</Toggle>);
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveClass("border"); // outline variant
    expect(toggle).toHaveClass("h-9"); // default size
  });

  it("applies outline variant with brand colors when pressed", () => {
    render(<Toggle pressed>Pressed Toggle</Toggle>);
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("data-state", "on");
    expect(toggle).toHaveClass("data-[state=on]:bg-brand-500");
    expect(toggle).toHaveClass("data-[state=on]:border-brand-500");
    expect(toggle).toHaveClass("data-[state=on]:text-white");
  });

  it("applies different sizes correctly", () => {
    const { rerender } = render(<Toggle size="sm">Small</Toggle>);
    expect(screen.getByRole("button")).toHaveClass("h-8");

    rerender(<Toggle size="lg">Large</Toggle>);
    expect(screen.getByRole("button")).toHaveClass("h-10");
  });

  it("handles press state changes", async () => {
    const handlePressedChange = vi.fn();
    const user = userEvent.setup();

    render(<Toggle onPressedChange={handlePressedChange}>Toggle Button</Toggle>);

    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("data-state", "off");

    await user.click(toggle);
    expect(handlePressedChange).toHaveBeenCalledWith(true);
  });

  it("can be disabled", () => {
    render(<Toggle disabled>Disabled Toggle</Toggle>);
    const toggle = screen.getByRole("button");
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveClass("disabled:opacity-50");
  });

  it("forwards additional props", () => {
    render(
      <Toggle data-testid="custom-toggle" className="custom-class">
        Custom Toggle
      </Toggle>,
    );
    const toggle = screen.getByTestId("custom-toggle");
    expect(toggle).toHaveClass("custom-class");
  });
});
