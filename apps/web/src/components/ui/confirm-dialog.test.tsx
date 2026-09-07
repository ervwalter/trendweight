import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("should close after a synchronous onConfirm", () => {
    render(<ConfirmDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("should stay open with both buttons disabled while an async onConfirm is pending", async () => {
    let resolveConfirm!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (resolveConfirm = resolve)));
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();

    // Escape must not dismiss the dialog mid-flight either
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();

    resolveConfirm();

    await waitFor(() => expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false));
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
  });

  it("should stay open when an async onConfirm rejects", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("boom"));
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("should call onOpenChange when cancel button is clicked", () => {
    render(<ConfirmDialog {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
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
