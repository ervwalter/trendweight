import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copies text to the clipboard and reports `copied` for a short confirmation window.
 * The reset timer is cleared on unmount so a navigation mid-window cannot flip state
 * on an unmounted component.
 */
export function useCopyToClipboard(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopied(false), resetAfterMs);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
