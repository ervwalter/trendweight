import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: "Confirm Action",
    description: "Are you sure you want to proceed?",
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render dialog when open is true", () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Confirm Action")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument();
  });

  it("should not render dialog when open is false", () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("should render default button texts", () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("should render custom button texts", () => {
    render(<ConfirmDialog {...defaultProps} confirmText="Delete" cancelText="Keep" />);

    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep" })).toBeInTheDocument();
  });

  it("should call onConfirm when confirm button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("should call onOpenChange when cancel button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should render destructive variant when destructive prop is true", () => {
    render(<ConfirmDialog {...defaultProps} destructive />);

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    // Check for dark mode destructive classes that are being applied
    expect(confirmButton).toHaveClass("dark:bg-destructive/60");
  });

  it("should render primary variant when destructive prop is false", () => {
    render(<ConfirmDialog {...defaultProps} destructive={false} />);

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    expect(confirmButton).toHaveClass("bg-primary");
  });

  it("should render ReactNode description", () => {
    const complexDescription = (
      <div>
        <p>This is a complex description.</p>
        <p>With multiple paragraphs.</p>
      </div>
    );

    render(<ConfirmDialog {...defaultProps} description={complexDescription} />);

    expect(screen.getByText("This is a complex description.")).toBeInTheDocument();
    expect(screen.getByText("With multiple paragraphs.")).toBeInTheDocument();
  });

  it("should have proper ARIA attributes", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");
  });

  it("should have overlay element", () => {
    render(<ConfirmDialog {...defaultProps} />);

    // Check that overlay exists (but don't test click behavior due to Radix complexity)
    const overlay = document.querySelector('[data-state="open"]');
    expect(overlay).toBeInTheDocument();
  });

  it("should have both buttons available for keyboard navigation", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });

    // Both buttons should be focusable
    expect(confirmButton).not.toHaveAttribute("disabled");
    expect(cancelButton).not.toHaveAttribute("disabled");
  });

  it("should render dialog with buttons inside", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    // Both buttons should be within the dialog
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Confirm" });

    expect(dialog).toContainElement(cancelButton);
    expect(dialog).toContainElement(confirmButton);
  });
});
