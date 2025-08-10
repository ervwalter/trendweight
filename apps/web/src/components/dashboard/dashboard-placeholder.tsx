import { Skeleton } from "../ui/skeleton";
import { Progress } from "../ui/progress";
import { useRealtimeProgress } from "../../lib/realtime/use-realtime-progress";

interface DashboardPlaceholderProps {
  progressId?: string;
}

const DashboardPlaceholder = ({ progressId }: DashboardPlaceholderProps) => {
  const { status, percent, message, providers } = useRealtimeProgress(progressId);

  return (
    <div className="relative">
      {/* Buttons placeholder */}
      <div className="mb-4 flex flex-col-reverse gap-4 md:flex-row">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-64" />
      </div>

      {/* Chart and Currently section */}
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:gap-12">
        <div className="relative">
          <Skeleton className="h-96 w-full md:w-[475px] lg:w-[650px] xl:w-[840px]" />

          {/* Progress overlay - show when we have any status */}
          {status && (
            <div className="absolute inset-x-0 bottom-4 mx-4">
              <div className="bg-background/80 ring-border space-y-2 rounded p-3 shadow ring-1 backdrop-blur">
                {/* Main progress bar */}
                {percent !== null ? <Progress value={percent} className="h-2" /> : <Progress className="h-2" />}

                {/* Status message */}
                {message && (
                  <p className="text-foreground text-sm" aria-live="polite">
                    {message}
                  </p>
                )}

                {/* Provider-specific progress */}
                {providers && providers.length > 0 && (
                  <div className="space-y-1">
                    {providers.map((provider) => (
                      <div key={provider.provider} className="text-muted-foreground text-xs">
                        {provider.provider === "fitbit" ? "Fitbit" : "Withings"}:{" "}
                        {provider.stage === "fetching" && provider.current !== null && provider.total !== null
                          ? `${provider.current}/${provider.total} chunks`
                          : provider.stage === "fetching" && provider.current !== null
                            ? `page ${provider.current}...`
                            : provider.message || provider.stage}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
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
