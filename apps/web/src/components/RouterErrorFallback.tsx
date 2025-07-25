import { ErrorUI } from "./ErrorUI";

interface RouterErrorFallbackProps {
  error: Error;
  reset?: () => void;
}

export function RouterErrorFallback({ error }: RouterErrorFallbackProps) {
  console.error("Router error fallback:", error);

  return <ErrorUI error={error} />;
}
