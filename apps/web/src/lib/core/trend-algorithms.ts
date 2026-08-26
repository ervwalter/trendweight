export const TREND_ALGORITHM_DEFAULT = "default";

export interface TrendAlgorithmInfo {
  id: string;
  name: string;
  description: string;
  trendLabel: string;
  isDefault: boolean;
}

// Ids must match TrendAlgorithmPresets on the backend and are stored in profiles — never rename.
export const TREND_ALGORITHMS: TrendAlgorithmInfo[] = [
  {
    id: TREND_ALGORITHM_DEFAULT,
    name: "Default (Hacker's Diet)",
    description: "The original exponentially smoothed moving average.",
    trendLabel: "Trend",
    isDefault: true,
  },
  {
    id: "holt-gentle",
    name: "Holt (gentle)",
    description: "Adds slow slope tracking to the default formula, keeping its familiar smoothness.",
    trendLabel: "Trend (Holt)",
    isDefault: false,
  },
  {
    id: "holt",
    name: "Holt (standard)",
    description: "Balanced slope tracking that follows steady weight loss with much less lag.",
    trendLabel: "Trend (Holt)",
    isDefault: false,
  },
  {
    id: "holt-responsive",
    name: "Holt (responsive)",
    description: "Adapts fastest to changes in direction, at the cost of a wigglier line.",
    trendLabel: "Trend (Holt)",
    isDefault: false,
  },
];

export function resolveTrendAlgorithm(id?: string | null): TrendAlgorithmInfo {
  return TREND_ALGORITHMS.find((a) => a.id === id) ?? TREND_ALGORITHMS[0];
}

export function getTrendLabel(id?: string | null): string {
  return resolveTrendAlgorithm(id).trendLabel;
}
