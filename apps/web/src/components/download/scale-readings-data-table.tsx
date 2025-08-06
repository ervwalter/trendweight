import { useMemo } from "react";
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { PaginationContent, PaginationItem } from "../ui/pagination";
import { formatMeasurement } from "../../lib/core/numbers";
import { LocalDate, convert } from "@js-joda/core";
import type { ScaleReading } from "./types";
import { cn } from "@/lib/utils";

interface ScaleReadingsDataTableProps {
  readings: ScaleReading[];
  viewType: string;
  useMetric: boolean;
}

// Create formatters once at module level
const dateFormatter = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat([], {
  hour: "numeric",
  minute: "2-digit",
});

const formatDate = (date: LocalDate) => {
  const nativeDate = convert(date).toDate();
  return dateFormatter.format(nativeDate);
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0);
  return timeFormatter.format(date);
};

export function ScaleReadingsDataTable({ readings, viewType, useMetric }: ScaleReadingsDataTableProps) {
  const isComputed = viewType === "computed";

  // Define columns based on view type
  const columns = useMemo<ColumnDef<ScaleReading>[]>(() => {
    const cols: ColumnDef<ScaleReading>[] = [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => <span suppressHydrationWarning>{formatDate(row.original.date)}</span>,
      },
    ];

    if (!isComputed) {
      cols.push({
        accessorKey: "time",
        header: "Time",
        cell: ({ row }) => {
          const time = row.original.time;
          return <span suppressHydrationWarning>{time ? formatTime(time) : "-"}</span>;
        },
      });
    }

    cols.push({
      accessorKey: "weight",
      header: isComputed ? "Actual Weight" : "Weight",
      cell: ({ row }) => {
        const weight = row.original.weight;
        const isInterpolated = row.original.weightIsInterpolated;
        return (
          <span className={cn(isInterpolated && "text-gray-500 italic")}>
            {weight !== undefined ? formatMeasurement(weight, { type: "weight", metric: useMetric }) : "-"}
          </span>
        );
      },
    });

    if (isComputed) {
      cols.push({
        accessorKey: "trend",
        header: "Trend Weight",
        cell: ({ row }) => {
          const trend = row.original.trend;
          return <span className="font-semibold">{trend !== undefined ? formatMeasurement(trend, { type: "weight", metric: useMetric }) : "-"}</span>;
        },
      });
    }

    cols.push({
      accessorKey: "fatRatio",
      header: isComputed ? "Actual Fat %" : "Body Fat %",
      cell: ({ row }) => {
        const fatRatio = row.original.fatRatio;
        const isInterpolated = row.original.fatIsInterpolated;
        return (
          <span className={cn(isInterpolated && "text-gray-500 italic")}>
            {fatRatio !== undefined && fatRatio !== null ? formatMeasurement(fatRatio, { type: "fatpercent", metric: useMetric }) : "-"}
          </span>
        );
      },
    });

    if (isComputed) {
      cols.push({
        accessorKey: "fatTrend",
        header: "Trend Fat %",
        cell: ({ row }) => {
          const fatTrend = row.original.fatTrend;
          return (
            <span className="font-semibold">
              {fatTrend !== undefined && fatTrend !== null ? formatMeasurement(fatTrend, { type: "fatpercent", metric: useMetric }) : "-"}
            </span>
          );
        },
      });
    }

    return cols;
  }, [isComputed, useMetric]);

  const table = useReactTable({
    data: readings,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  });

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const showPagination = pageCount > 1;

  return (
    <div className="inline-block space-y-4">
      {/* Top info and pagination */}
      {(showPagination || readings.length > 0) && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm whitespace-nowrap text-gray-600">{readings.length} total readings</div>
          {showPagination && (
            <div>
              <PaginationContent className="flex">
                <PaginationItem>
                  <Button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} variant="outline" size="icon" aria-label="First page">
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} variant="outline" size="icon" aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm text-gray-600">
                    Page {currentPage} of {pageCount}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} variant="outline" size="icon" aria-label="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    onClick={() => table.setPageIndex(pageCount - 1)}
                    disabled={!table.getCanNextPage()}
                    variant="outline"
                    size="icon"
                    aria-label="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="border-b border-gray-300">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="pr-6 pb-2 pl-6 text-left font-semibold">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row, index) => (
            <TableRow key={row.id} className={cn("border-b border-gray-200", index % 2 === 1 && "bg-gray-100")}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-2 pr-6 pl-6">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Bottom pagination */}
      {showPagination && (
        <div className="flex justify-end">
          <PaginationContent>
            <PaginationItem>
              <Button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} variant="outline" size="icon" aria-label="First page">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} variant="outline" size="icon" aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm text-gray-600">
                Page {currentPage} of {pageCount}
              </span>
            </PaginationItem>
            <PaginationItem>
              <Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} variant="outline" size="icon" aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()} variant="outline" size="icon" aria-label="Last page">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </div>
      )}
    </div>
  );
}
