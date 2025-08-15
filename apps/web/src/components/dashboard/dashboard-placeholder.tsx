import { Skeleton } from "../ui/skeleton";
import { useSyncProgress } from "./sync-progress/hooks";

const DashboardPlaceholder = () => {
  useSyncProgress(); // Auto-manages toast when sync is active
  return (
    <div className="relative">
      {/* Buttons placeholder */}
      <div className="mb-4 flex flex-col-reverse gap-4 md:flex-row">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Chart and Currently section */}
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:gap-12">
        <div className="w-full md:w-[475px] lg:w-[650px] xl:w-[840px]">
          <div className="relative">
            {/* Chart skeleton with aspect ratio matching Highcharts default */}
            <div className="aspect-[16/10] w-full">
              <Skeleton className="h-full w-full" />
            </div>

            {/* Toast will automatically appear when sync is active */}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>

      {/* Recent Readings and Stats section */}
      <div className="flex flex-col-reverse gap-4 md:flex-row md:gap-12 lg:gap-20">
        <div className="w-full md:w-auto">
          <Skeleton className="mb-4 h-8 w-48" />
          {/* Table skeleton matching md:min-w-[280px] */}
          <div className="w-full space-y-2 md:w-[280px]">
            {/* Table header */}
            <div className="flex gap-4 pb-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="ml-auto h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
            {/* Table rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="ml-auto h-5 w-16" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {/* Deltas section */}
          <div>
            <Skeleton className="mb-3 h-6 w-48" />
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-5 w-64" />
              ))}
            </div>
          </div>
          {/* Stats section */}
          <div>
            <Skeleton className="mb-3 h-6 w-52" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-80" />
              <Skeleton className="mt-4 h-5 w-72" />
              <Skeleton className="h-5 w-64" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPlaceholder;
