import { useState, type MouseEvent, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  /**
   * Runs when the confirm button is clicked. If it returns a promise, the dialog stays open
   * (with both buttons disabled) until it settles and closes only when it resolves. A rejected
   * promise keeps the dialog open so the caller can render the error in `description`; the
   * rejection itself is swallowed here, so callers that want a toast must catch it themselves.
   */
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = (event: MouseEvent<HTMLButtonElement>) => {
    // Radix's AlertDialogAction closes the dialog after onClick unless the event is default-prevented
    event.preventDefault();
    const result = onConfirm();
    if (!(result instanceof Promise)) {
      onOpenChange(false);
      return;
    }
    setIsPending(true);
    result
      .then(
        () => onOpenChange(false),
        () => {
          // Keep the dialog open; the caller owns error presentation
        },
      )
      .finally(() => setIsPending(false));
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-muted-foreground text-sm">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} asChild>
            <Button variant={destructive ? "destructive" : "default"} size="sm" disabled={isPending}>
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
