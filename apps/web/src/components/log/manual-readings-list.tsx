import { convert, LocalDate } from "@js-joda/core";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteAllManualReadings, useDeleteManualReading } from "@/lib/api/mutations";
import { useManualReadings, useProfile } from "@/lib/api/queries";
import type { ManualReading } from "@/lib/api/types";
import { formatPercent, formatWeight } from "@/lib/core/numbers";
import { fromKg } from "@/lib/core/weight-units";
import { useToast } from "@/lib/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { ManualReadingDialog } from "./manual-reading-dialog";

const PAGE_SIZE = 50;

// Create formatters once at module level
const dateFormatter = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formatDate = (date: string) => {
  return dateFormatter.format(convert(LocalDate.parse(date)).toDate());
};

export function ManualReadingsList() {
  const { data: readings } = useManualReadings();
  const { data: profile } = useProfile();
  const deleteReading = useDeleteManualReading();
  const deleteAllReadings = useDeleteAllManualReadings();
  const { showToast } = useToast();

  const [page, setPage] = useState(0);
  const [editingReading, setEditingReading] = useState<ManualReading | null>(null);
  const [deletingReading, setDeletingReading] = useState<ManualReading | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const useMetric = profile?.useMetric ?? false;

  if (readings.length === 0) {
    return (
      <div className="border-border rounded-lg border border-dashed px-6 py-10 text-center">
        <p className="text-muted-foreground text-sm">Nothing logged yet. Use the Add Entry button to log your first weight.</p>
      </div>
    );
  }

  const pageCount = Math.ceil(readings.length / PAGE_SIZE);
  const currentPage = Math.min(page, pageCount - 1);
  const pageReadings = readings.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const showPagination = pageCount > 1;

  const handleDelete = async () => {
    if (!deletingReading) return;
    try {
      await deleteReading.mutateAsync(deletingReading.date);
      showToast({ title: "Entry deleted", variant: "success" });
    } catch {
      showToast({ title: "Something went wrong", description: "The entry could not be deleted. Please try again.", variant: "error" });
    } finally {
      setDeletingReading(null);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllReadings.mutateAsync();
      showToast({ title: "Weight log cleared", variant: "success" });
    } catch {
      showToast({ title: "Something went wrong", description: "Your entries could not be deleted. Please try again.", variant: "error" });
    } finally {
      setConfirmDeleteAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-muted-foreground text-sm whitespace-nowrap">
          {readings.length} {readings.length === 1 ? "entry" : "entries"}
        </div>
        {showPagination && (
          <PaginationContent>
            <PaginationItem>
              <Button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0} variant="outline" size="icon" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="text-muted-foreground px-3 text-sm">
                Page {currentPage + 1} of {pageCount}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1} variant="outline" size="icon" aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        )}
      </div>

      <ul aria-label="Weight log entries" className="divide-border border-border divide-y border-y">
        {pageReadings.map((reading) => (
          <li key={reading.date} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0 font-medium" suppressHydrationWarning>
              {formatDate(reading.date)}
            </div>
            <div className="ml-auto text-right">
              <div className="font-semibold tabular-nums">{formatWeight(fromKg(reading.weight, useMetric), useMetric)}</div>
              {reading.fatRatio !== undefined && reading.fatRatio !== null && (
                <div className="text-muted-foreground text-sm tabular-nums">{formatPercent(reading.fatRatio)} fat</div>
              )}
            </div>
            <div className="flex shrink-0">
              <Button variant="ghost" size="icon" aria-label={`Edit entry for ${formatDate(reading.date)}`} onClick={() => setEditingReading(reading)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete entry for ${formatDate(reading.date)}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setDeletingReading(reading)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDeleteAll(true)}>
          Delete all entries
        </Button>
        {showPagination && (
          <PaginationContent>
            <PaginationItem>
              <Button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 0} variant="outline" size="icon" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="text-muted-foreground px-3 text-sm">
                Page {currentPage + 1} of {pageCount}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button onClick={() => setPage(currentPage + 1)} disabled={currentPage >= pageCount - 1} variant="outline" size="icon" aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        )}
      </div>

      <ManualReadingDialog open={!!editingReading} onOpenChange={(open) => !open && setEditingReading(null)} initialReading={editingReading ?? undefined} />

      <ConfirmDialog
        open={!!deletingReading}
        onOpenChange={(open) => !open && setDeletingReading(null)}
        title="Delete this entry?"
        description={deletingReading ? `${formatDate(deletingReading.date)} — ${formatWeight(fromKg(deletingReading.weight, useMetric), useMetric)}` : ""}
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
        title="Delete your entire weight log?"
        description={`This permanently removes all ${readings.length} entries you've logged. Data from connected scales is not affected.`}
        confirmText="Delete All"
        destructive
        onConfirm={handleDeleteAll}
      />
    </div>
  );
}
