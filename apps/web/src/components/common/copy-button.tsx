import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  /** Text placed on the clipboard */
  value: string;
  disabled?: boolean;
  className?: string;
}

/** Icon button that copies `value` and shows a check mark for two seconds afterwards */
export function CopyButton({ value, disabled, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Don't flip state on an unmounted component if the user navigates away mid-timer
  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      variant="ghost"
      size="sm"
      className={cn("absolute top-1/2 right-2 -translate-y-1/2 p-1", className)}
      title={copied ? "Copied!" : "Copy to clipboard"}
      aria-label={copied ? "Copied!" : "Copy to clipboard"}
      disabled={disabled}
    >
      {copied ? <Check className="text-success h-5 w-5" /> : <Copy className="h-5 w-5" />}
    </Button>
  );
}
