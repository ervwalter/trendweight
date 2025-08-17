import { Heading } from "@/components/common/heading";

export function Blurb() {
  return (
    <div className="flex flex-col items-center justify-center md:pr-6">
      <div>
        <Heading level={2} className="pb-4">
          Am I losing weight?
        </Heading>
        <div className="pb-4">TrendWeight can help answer that question by analyzing your day to day weight changes</div>
        <div className="pb-4">
          <b>Step 1</b>: Weigh yourself every day.
          <br />
          <b>Step 2</b>: There is no Step 2!
        </div>
        <div className="pb-4">
          <i>Losing weight is hard</i>. Don't beat yourself just because your weight is higher today than it was yesterday.
        </div>
        <div>
          Our weight fluctuates—it just does. That's completely normal. TrendWeight is a tool that helps you focus on your weight <i>trend</i> over time instead
          of day to day changes.
        </div>
      </div>
    </div>
  );
}
