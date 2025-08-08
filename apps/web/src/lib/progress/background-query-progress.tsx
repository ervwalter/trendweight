import { useEffect } from "react";
import { useIsFetching } from "@tanstack/react-query";
import progressManager from "./progress";

/**
 * Component that tracks React Query fetching state and shows progress bar
 * Matches legacy BackgroundQueryProgress behavior
 */
export function BackgroundQueryProgress() {
  const isFetching = useIsFetching();

  useEffect(() => {
    progressManager.setFetching(isFetching);
  }, [isFetching]);

  return null;
}

export default BackgroundQueryProgress;
