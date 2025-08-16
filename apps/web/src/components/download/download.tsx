import { Download as DownloadIcon } from "lucide-react";
import { useState } from "react";
import { useProviderLinks } from "../../lib/api/queries";
import { downloadScaleReadingsCSV } from "../../lib/download/csv-export";
import { useScaleReadingsData } from "../../lib/download/use-scale-readings-data";
import { Heading } from "../common/heading";
import { Button } from "../ui/button";
import { ScaleReadingsDataTable } from "./scale-readings-data-table";
import { SortToggle } from "./sort-toggle";
import type { ViewType } from "./types";
import { ViewToggleButtons } from "./view-toggle-buttons";

export function Download() {
  const [viewType, setViewType] = useState<ViewType>("computed");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  // Load data
  const { data: providerLinks } = useProviderLinks();
  const { readings, profile } = useScaleReadingsData(viewType, sortNewestFirst);

  const connectedProviders = providerLinks?.filter((link) => link.hasToken && !link.isDisabled) || [];

  const handleDownloadCSV = () => {
    downloadScaleReadingsCSV(readings, viewType, profile?.useMetric ?? false);
  };

  if (connectedProviders.length === 0) {
    return (
      <>
        <Heading level={1}>Download Your Data</Heading>
        <p className="text-muted-foreground mt-4">No providers connected. Please connect a scale provider from the settings page.</p>
      </>
    );
  }

  return (
    <>
      <Heading level={1}>Download Your Data</Heading>

      {/* View and Sort controls */}
      <div className="mt-6 mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <ViewToggleButtons viewType={viewType} onViewChange={setViewType} providerLinks={connectedProviders} />
        <div className="sm:ml-4">
          <SortToggle sortNewestFirst={sortNewestFirst} onSortChange={setSortNewestFirst} />
        </div>
      </div>

      {/* Download button */}
      <div className="mb-4">
        <Button onClick={handleDownloadCSV} variant="default" size="sm" className="dark:bg-primary/75 dark:hover:bg-primary/65 dark:active:bg-primary/55">
          <DownloadIcon className="mr-2 h-4 w-4" />
          Download as CSV
        </Button>
      </div>

      {/* Data table */}
      {readings.length === 0 ? (
        <p className="text-muted-foreground">No data available for the selected view.</p>
      ) : (
        <ScaleReadingsDataTable readings={readings} viewType={viewType} useMetric={profile?.useMetric ?? false} />
      )}
    </>
  );
}
