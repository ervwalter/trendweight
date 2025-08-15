import { Skeleton } from "../ui/skeleton";
import { useSyncProgress } from "../dashboard/sync-progress/hooks";

const DownloadPlaceholder = () => {
  useSyncProgress(); // Auto-manages toast when sync is active

  return (
    <div className="space-y-6">
      {/* Page title */}
      <Skeleton className="h-8 w-48" />

      {/* View and Sort controls */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="sm:ml-4">
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Download button */}
      <Skeleton className="h-9 w-36" />

      {/* Table skeleton */}
      <div className="space-y-4">
        {/* Table info and pagination top */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>

        {/* Table */}
        <div className="space-y-3">
          {/* Table header */}
          <div className="flex gap-6 border-b pb-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>

          {/* Table rows */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex gap-6 py-1">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>

        {/* Table pagination bottom */}
        <div className="flex justify-end">
          <div className="flex gap-1">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  );
};

export { DownloadPlaceholder };
