import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent } from "react";
import { Switch } from "./switch";

describe("Switch", () => {
  it("renders unchecked by default", () => {
    render(<Switch />);

    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("renders as checked when checked prop is true", () => {
    render(<Switch checked={true} />);

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("toggles its state and reports it when clicked", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(<Switch checked={false} onCheckedChange={handleChange} />);
    const switchElement = screen.getByRole("switch");

    await user.click(switchElement);
    expect(handleChange).toHaveBeenLastCalledWith(true);

    // Simulate controlled component behavior
    rerender(<Switch checked={true} onCheckedChange={handleChange} />);
    expect(switchElement).toBeChecked();

    await user.click(switchElement);
    expect(handleChange).toHaveBeenLastCalledWith(false);
  });

  it("ignores clicks while disabled", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch disabled onCheckedChange={handleChange} />);
    const switchElement = screen.getByRole("switch");

    expect(switchElement).toBeDisabled();
    await user.click(switchElement);
    expect(switchElement).not.toBeChecked();
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("submits its name and value with the enclosing form", async () => {
    const user = userEvent.setup();
    const submitted = vi.fn();
    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submitted(Object.fromEntries(new FormData(event.currentTarget).entries()));
    };

    render(
      <form onSubmit={handleSubmit}>
        <Switch name="notifications" value="enabled" defaultChecked />
        <button type="submit">Save</button>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(submitted).toHaveBeenCalledWith({ notifications: "enabled" });
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Switch ref={ref} />);

    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
  });

  it("toggles with the Space key", async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch onCheckedChange={handleChange} />);
    const switchElement = screen.getByRole("switch");

    switchElement.focus();
    expect(switchElement).toHaveFocus();

    await user.keyboard(" ");
    expect(handleChange).toHaveBeenCalledWith(true);
    expect(switchElement).toBeChecked();
  });
});
