import { Button } from "./button";
import { HiChevronLeft, HiChevronRight, HiChevronDoubleLeft, HiChevronDoubleRight } from "react-icons/hi";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  totalItems?: number;
  itemLabel?: string;
}

export function Pagination({ currentPage, totalPages, onPageChange, className = "", totalItems, itemLabel = "items" }: PaginationProps) {
  // If only showing the count with no pagination controls
  if (totalPages <= 1 && totalItems !== undefined) {
    return (
      <div className={`text-sm text-gray-600 ${className}`}>
        {totalItems} total {itemLabel}
      </div>
    );
  }

  // If no pagination needed and no count, return null
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Button onClick={() => onPageChange(1)} disabled={currentPage === 1} variant="outline" size="sm" aria-label="First page">
          <HiChevronDoubleLeft className="h-4 w-4" />
        </Button>
        <Button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} variant="outline" size="sm" aria-label="Previous page">
          <HiChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          aria-label="Next page"
        >
          <HiChevronRight className="h-4 w-4" />
        </Button>
        <Button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} variant="outline" size="sm" aria-label="Last page">
          <HiChevronDoubleRight className="h-4 w-4" />
        </Button>
      </div>
      {totalItems !== undefined && (
        <div className="text-sm text-gray-600">
          {totalItems} total {itemLabel}
        </div>
      )}
    </div>
  );
}
