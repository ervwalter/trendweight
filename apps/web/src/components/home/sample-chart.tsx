import { useTheme } from "../../lib/hooks/use-theme";

export function SampleChart() {
  const { theme } = useTheme();
  const imageSrc = theme === "dark" ? "/chart-home-dark.png" : "/chart-home.png";

  return (
    <div>
      <img src={imageSrc} alt="Sample weight trend chart" className="h-auto w-full" />
    </div>
  );
}
