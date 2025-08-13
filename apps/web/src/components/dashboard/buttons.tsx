import { useEffect } from "react";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { useDashboardData } from "../../lib/dashboard/hooks";
import { useIsMobile } from "../../lib/hooks/use-media-query";
import type { Mode, TimeRange } from "../../lib/core/interfaces";

const Buttons = () => {
  const {
    mode: [mode, setMode],
    timeRange: [timeRange, setTimeRange],
  } = useDashboardData();
  const isMobile = useIsMobile();

  // Switch away from explore mode when going to mobile
  useEffect(() => {
    if (isMobile && timeRange === "explore") {
      setTimeRange("4w");
    }
  }, [isMobile, timeRange, setTimeRange]);

  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row print:hidden">
      <ToggleGroup
        type="single"
        value={timeRange}
        onValueChange={(value) => {
          if (value && value !== "") setTimeRange(value as TimeRange);
        }}
        defaultValue="4w"
        aria-label="Time Range"
      >
        <ToggleGroupItem value="4w">
          <span className="lg:hidden">4 wk</span>
          <span className="hidden lg:inline">4 weeks</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="3m">
          <span className="lg:hidden">3 mo</span>
          <span className="hidden lg:inline">3 months</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="6m">
          <span className="lg:hidden">6 mo</span>
          <span className="hidden lg:inline">6 months</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="1y">
          <span className="lg:hidden">1 yr</span>
          <span className="hidden lg:inline">1 year</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        {!isMobile && <ToggleGroupItem value="explore">Explore</ToggleGroupItem>}
      </ToggleGroup>

      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => {
          if (value && value !== "") setMode(value as Mode);
        }}
        defaultValue="weight"
        aria-label="Mode"
      >
        <ToggleGroupItem value="weight">Weight</ToggleGroupItem>
        <ToggleGroupItem value="fatpercent">Fat %</ToggleGroupItem>
        <ToggleGroupItem value="fatmass">Fat Mass</ToggleGroupItem>
        <ToggleGroupItem value="leanmass">Lean Mass</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default Buttons;
