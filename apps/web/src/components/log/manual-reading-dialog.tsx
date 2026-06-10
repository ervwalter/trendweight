import { Link, useRouterState } from "@tanstack/react-router";
import { Suspense } from "react";
import type { ManualReading } from "@/lib/api/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ManualReadingForm } from "./manual-reading-form";

interface ManualReadingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this reading; otherwise it adds a new one */
  initialReading?: ManualReading;
}

export function ManualReadingDialog({ open, onOpenChange, initialReading }: ManualReadingDialogProps) {
  const isEdit = !!initialReading;
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showManageLink = !isEdit && pathname !== "/log";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Entry" : "Log Weight"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this weight log entry." : "Record your weight. It will appear in your charts alongside data from connected scales."}
          </DialogDescription>
        </DialogHeader>
        <Suspense fallback={<div className="text-muted-foreground py-8 text-center text-sm">Loading...</div>}>
          <ManualReadingForm initialReading={initialReading} onSaved={() => onOpenChange(false)} />
        </Suspense>
        {showManageLink && (
          <p className="text-muted-foreground text-sm">
            Need to change a past entry?{" "}
            <Link to="/log" className="text-link underline" onClick={() => onOpenChange(false)}>
              Edit your weight log
            </Link>
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
