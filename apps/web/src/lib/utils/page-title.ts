export function pageTitle(title?: string): string {
  if (!title || title === "TrendWeight") {
    return "TrendWeight";
  }
  return `${title} - TrendWeight`;
}
