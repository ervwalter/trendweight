import { Button } from "../ui/Button";
import { FiCopy, FiCheck } from "react-icons/fi";

interface QuickActionsSectionProps {
  onCopyClick: () => void;
  copied: boolean;
  mailtoLink: string;
}

export function QuickActionsSection({ onCopyClick, copied, mailtoLink }: QuickActionsSectionProps) {
  return (
    <div className="mb-4 flex justify-end gap-3">
      <Button onClick={onCopyClick} variant="secondary" size="md" className="flex items-center gap-2">
        {copied ? (
          <>
            <FiCheck className="h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <FiCopy className="h-4 w-4" />
            Copy Build Info
          </>
        )}
      </Button>
      <a href={mailtoLink}>
        <Button variant="primary" size="md">
          Email Support
        </Button>
      </a>
    </div>
  );
}
