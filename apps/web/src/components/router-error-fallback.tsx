import type { ErrorComponentProps } from "@tanstack/react-router";
import { ErrorUI } from "./error-ui";

export function RouterErrorFallback({ error }: ErrorComponentProps) {
  console.error("Router error fallback:", error);

  const normalizedError = error instanceof Error ? error : new Error(String(error));
  return <ErrorUI error={normalizedError} />;
}
