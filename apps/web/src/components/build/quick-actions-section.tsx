import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface QuickActionsSectionProps {
  onCopyClick: () => void;
  copied: boolean;
  mailtoLink: string;
}

export function QuickActionsSection({ onCopyClick, copied, mailtoLink }: QuickActionsSectionProps) {
  return (
    <div className="mb-4 flex justify-end gap-3">
      <Button onClick={onCopyClick} variant="outline" className="flex items-center gap-2">
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy Build Info
          </>
        )}
      </Button>
      <a href={mailtoLink}>
        <Button variant="default">Email Support</Button>
      </a>
    </div>
  );
}
