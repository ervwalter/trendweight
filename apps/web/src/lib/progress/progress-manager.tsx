import { useEffect } from "react";
import { useProgress } from "@bprogress/react";
import progressManager from "./progress";

/**
 * Component that initializes the progress manager with the progress instance
 */
export function ProgressManager() {
  const progress = useProgress();

  useEffect(() => {
    progressManager.setProgress(progress);
  }, [progress]);

  return null;
}

export default ProgressManager;
