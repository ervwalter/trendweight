import { createContext } from "react";
import type { SyncProgress } from "./types";

export interface SyncProgressContextValue {
  progressId: string;
  progress: SyncProgress | null;
  startProgress: (message: string) => void;
  endProgress: () => void;
  setServerProgress: (progress: SyncProgress) => void;
}

export const SyncProgressContext = createContext<SyncProgressContextValue | null>(null);
