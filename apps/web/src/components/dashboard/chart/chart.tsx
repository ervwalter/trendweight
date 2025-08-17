import HighchartsReact from "highcharts-react-official";
import Highstock from "highcharts/highstock";
// In Highcharts v12+, modules auto-initialize
import "highcharts/modules/exporting";
import "highcharts/modules/offline-exporting";
import { useEffect, useRef, useState } from "react";
import { useChartOptions } from "../../../lib/dashboard/chart/use-chart-options";
import { useDashboardData } from "../../../lib/dashboard/hooks";
import { useEmbedParams } from "../../../lib/hooks/use-embed-params";

const Chart = () => {
  const data = useDashboardData();
  const { embed } = useEmbedParams();
  const options = useChartOptions(data, embed ? "60%" : undefined);
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const printImageRef = useRef<HTMLImageElement>(null);
  const [printImageUrl, setPrintImageUrl] = useState<string | null>(null);

  useEffect(() => {
    // Disable legend clicking with CSS
    const style = document.createElement("style");
    style.textContent = ".highcharts-legend-item { pointer-events: none !important; cursor: default !important; }";
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Clear print image when chart data/options change
  useEffect(() => {
    setPrintImageUrl(null);
  }, [data, options]);

  // Handle print events
  useEffect(() => {
    let hadDarkClass = false;

    const handleBeforePrint = async () => {
      // Temporarily remove dark class to ensure light mode colors for print
      const htmlElement = document.documentElement;
      hadDarkClass = htmlElement.classList.contains("dark");
      if (hadDarkClass) {
        htmlElement.classList.remove("dark");
      }

      // Always generate a fresh image when printing
      const imageUrl = await generateChartImage();
      if (imageUrl) {
        setPrintImageUrl(imageUrl);
      }

      // Restore dark class if it was present
      if (hadDarkClass) {
        // Small delay to ensure image generation is complete
        setTimeout(() => {
          htmlElement.classList.add("dark");
        }, 100);
      }
    };

    const handleAfterPrint = () => {
      // Restore dark class if it was removed
      if (hadDarkClass) {
        document.documentElement.classList.add("dark");
      }
    };

    // Add event listeners
    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    // Also handle media query for better browser support
    const mediaQueryList = window.matchMedia("print");
    const handleMediaQueryChange = (mql: MediaQueryListEvent | MediaQueryList) => {
      if (mql.matches) {
        handleBeforePrint();
      } else {
        handleAfterPrint();
      }
    };

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handleMediaQueryChange);
    }

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", handleMediaQueryChange);
      }
    };
  }, []);

  // Shared function to generate chart image
  const generateChartImage = async (): Promise<string | null> => {
    if (chartRef.current?.chart) {
      const chart = chartRef.current.chart;

      // Use the same dimensions and scale as the export button
      const exportingChart = chart as Highstock.Chart & {
        getSVG: (chartOptions?: Highstock.Options) => string;
      };

      // Get SVG with exact same options as export
      // Always use white background for printing (dark mode is screen-only)
      const svg = exportingChart.getSVG({
        chart: {
          width: chart.chartWidth,
          height: chart.chartHeight,
          backgroundColor: "#ffffff",
        },
      });

      // Create a more accurate canvas conversion
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Match the export button's scale
      const scale = 2;
      canvas.width = chart.chartWidth * scale;
      canvas.height = chart.chartHeight * scale;

      // Create image from SVG
      const img = new Image();
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      return new Promise<string | null>((resolve) => {
        img.onload = () => {
          if (ctx) {
            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // Scale the context to match our scale factor
            ctx.scale(scale, scale);

            // Draw at original size (the scaling will make it high res)
            ctx.drawImage(img, 0, 0, chart.chartWidth, chart.chartHeight);

            const dataUrl = canvas.toDataURL("image/png");
            URL.revokeObjectURL(svgUrl);
            resolve(dataUrl);
          } else {
            resolve(null);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          resolve(null);
        };
        img.src = svgUrl;
      });
    }
    return null;
  };

  return (
    <div>
      {/* Regular chart - hidden during print */}
      <div className="print:hidden">
        <HighchartsReact ref={chartRef} highcharts={Highstock} options={options} immutable={true} constructorType="stockChart" />
      </div>

      {/* Print image - only visible during print */}
      {printImageUrl && <img ref={printImageRef} src={printImageUrl} alt="Chart for printing" className="hidden h-auto w-full print:block print:w-auto" />}
    </div>
  );
};

export default Chart;
