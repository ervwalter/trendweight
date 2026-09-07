import { onTestFinished, vi } from "vitest";

export const DEFAULT_FROZEN_TIME = "2024-01-15T12:00:00";

// Freezes Date (and therefore js-joda's LocalDate.now(), which reads Date.now()) at the given
// local-time ISO string. Only Date is faked: setTimeout, promises and waitFor keep real timers.
// Real time is restored when the current test finishes.
export function freezeClock(iso: string = DEFAULT_FROZEN_TIME): Date {
  const frozen = new Date(iso);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(frozen);
  onTestFinished(() => {
    vi.useRealTimers();
  });
  return frozen;
}
