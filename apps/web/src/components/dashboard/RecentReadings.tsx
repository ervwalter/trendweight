import { recentDate } from "../../lib/core/dates";
import { Modes } from "../../lib/core/interfaces";
import { formatMeasurement } from "../../lib/core/numbers";
import { useDashboardData } from "../../lib/dashboard/hooks";
import { Heading } from "../ui/Heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

const RecentReadings = () => {
  const {
    dataPoints,
    mode: [mode],
    profile: { useMetric },
  } = useDashboardData();

  const readings = dataPoints.slice(-14).reverse();

  return (
    <div>
      <Heading level={3}>Recent {Modes[mode]} Readings</Heading>
      <div className="w-full md:w-auto md:min-w-[280px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-0 text-left">Date</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="pr-0 text-right">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {readings.map((m) => (
              <TableRow key={m.date.toEpochDay()}>
                <TableCell className="pl-0" suppressHydrationWarning>
                  {recentDate(m.date)}
                </TableCell>
                <TableCell className="text-right text-gray-400">{formatMeasurement(m.actual, { type: mode, metric: useMetric, units: false })}</TableCell>
                <TableCell className="pr-0 text-right font-semibold">{formatMeasurement(m.trend, { type: mode, metric: useMetric, units: false })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RecentReadings;
