import Highstock from "highcharts/highstock";
import { formatNumber } from "../../core/numbers";

const chartOptionsTemplate = (): Highstock.Options => ({
  accessibility: {
    enabled: false,
  },
  chart: {
    plotBorderWidth: 0.25,
    plotBorderColor: "#999999",
    panning: { enabled: false },
    spacingBottom: 40,
    spacingRight: 0,
    spacingLeft: 0,
    ignoreHiddenSeries: false,
    animation: true,
    height: "56%",
  },
  credits: {
    enabled: false,
  },
  exporting: {
    enabled: false,
  },
  legend: {
    backgroundColor: "#ffffff",
    enabled: true,
    y: 40,
  },
  navigator: {
    enabled: false,
  },
  rangeSelector: {
    enabled: false,
  },
  scrollbar: {
    enabled: false,
  },
  plotOptions: {
    series: {
      animation: {
        duration: 300,
      },
      clip: true,
      events: {
        legendItemClick: () => false,
      },
      states: {
        hover: {
          enabled: false,
        },
        inactive: {
          opacity: 1,
        },
      },
    },
  },
  tooltip: {
    formatter: function () {
      try {
        return this.points?.reduce(
          (s, point) => {
            if (point.series.type === "ohlc") {
              return s;
            }
            return s + `<br/><span style="color: ${point.color};">${point.series.name}:</span> <b>${formatNumber(point.y as number)}</b>`;
          },
          `${Highstock.dateFormat("%a, %b %e, %Y", this.x as number)}`,
        );
      } catch {
        return "";
      }
    },
  },
  xAxis: {
    units: [
      ["hour", [1, 2, 3, 4, 6, 8, 12]],
      ["day", [1]],
      ["week", [1]],
      ["month", [1, 3, 6]],
      ["year", [1]],
    ],
    crosshair: true,
    ordinal: false,
    lineWidth: 0,
    dateTimeLabelFormats: {
      second: "%H:%M:%S",
      minute: "%H:%M",
      hour: "%H:%M",
      day: "%b %e",
      week: "%b %e",
      month: "%b '%y",
      year: "%Y",
    },
  },
  yAxis: {
    allowDecimals: false,
    showFirstLabel: false,
    showLastLabel: false,
    endOnTick: true,
    startOnTick: true,
    lineWidth: 0,
    gridLineWidth: 0.5,
    gridZIndex: 0,
    labels: {
      x: -4,
      y: 4,
      align: "right",
    },
  },
  series: [],
});

export default chartOptionsTemplate;
