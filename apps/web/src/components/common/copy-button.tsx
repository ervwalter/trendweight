import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  /** Text placed on the clipboard */
  value: string;
  disabled?: boolean;
  className?: string;
}

/** Icon button that copies `value` and shows a check mark for two seconds afterwards */
export function CopyButton({ value, disabled, className }: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <Button
      type="button"
      onClick={() => copy(value)}
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
