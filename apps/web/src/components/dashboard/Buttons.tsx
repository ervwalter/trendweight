import { useEffect } from "react";
import { ToggleButton } from "../ui/ToggleButton";
import { ToggleButtonGroup } from "../ui/ToggleButtonGroup";
import { useDashboardData } from "../../lib/dashboard/hooks";
import { useIsMobile } from "../../lib/hooks/useMediaQuery";
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
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      <ToggleButtonGroup value={timeRange} onChange={(value) => setTimeRange(value as TimeRange)} defaultValue="4w" aria-label="Time Range">
        <ToggleButton value="4w">
          <span className="lg:hidden">4 wk</span>
          <span className="hidden lg:inline">4 weeks</span>
        </ToggleButton>
        <ToggleButton value="3m">
          <span className="lg:hidden">3 mo</span>
          <span className="hidden lg:inline">3 months</span>
        </ToggleButton>
        <ToggleButton value="6m">
          <span className="lg:hidden">6 mo</span>
          <span className="hidden lg:inline">6 months</span>
        </ToggleButton>
        <ToggleButton value="1y">
          <span className="lg:hidden">1 yr</span>
          <span className="hidden lg:inline">1 year</span>
        </ToggleButton>
        <ToggleButton value="all">All</ToggleButton>
        {!isMobile && <ToggleButton value="explore">Explore</ToggleButton>}
      </ToggleButtonGroup>

      <ToggleButtonGroup value={mode} onChange={(value) => setMode(value as Mode)} defaultValue="weight" aria-label="Mode">
        <ToggleButton value="weight">Weight</ToggleButton>
        <ToggleButton value="fatpercent">Fat %</ToggleButton>
        <ToggleButton value="fatmass">Fat Mass</ToggleButton>
        <ToggleButton value="leanmass">Lean Mass</ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
};

export default Buttons;
