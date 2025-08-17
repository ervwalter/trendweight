import { Container } from "@/components/container";
import { Blurb } from "./blurb";
import { InfoButtons } from "./info-buttons";
import { SampleChart } from "./sample-chart";
import { WorksWith } from "./works-with";

export function MainContent() {
  return (
    <Container className="flex-grow py-6 md:py-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_3fr] md:gap-10">
        {/* Grid areas match legacy app layout */}
        <div className="order-1 md:order-1">
          <Blurb />
        </div>
        <div className="order-3 md:order-2">
          <SampleChart />
        </div>
        <div className="order-2 md:order-3 md:col-span-2">
          <InfoButtons />
        </div>
        <div className="order-4 md:col-span-2">
          <WorksWith />
        </div>
      </div>
    </Container>
  );
}
