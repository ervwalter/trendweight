import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders children correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies default variant and size styles", () => {
    render(<Button>Default Button</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-brand-600"); // primary variant
    expect(button).toHaveClass("px-4 py-2"); // md size
  });

  it("applies different variants correctly", () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-white");

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole("button")).toHaveClass("text-gray-700");

    rerender(<Button variant="success">Success</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-green-600");

    rerender(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-red-700");

    rerender(<Button variant="warning">Warning</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-amber-600");
  });

  it("applies different sizes correctly", () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button")).toHaveClass("px-3 py-1.5");

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("px-6 py-3");

    rerender(<Button size="xl">Extra Large</Button>);
    expect(screen.getByRole("button")).toHaveClass("px-6 py-6");
  });

  it("handles click events", async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);
    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("can be disabled", () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:opacity-50");
  });

  it("merges custom className", () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole("button");

    expect(button).toHaveClass("custom-class");
    expect(button).toHaveClass("bg-brand-600"); // Still has default styles
  });

  it("renders as child component when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Link Button" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/test");
    expect(link).toHaveClass("bg-brand-600"); // Has button styles
  });

  it("forwards ref correctly", () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Button with ref</Button>);

    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
  });
});
