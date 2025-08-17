import { X } from "lucide-react";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "@/components/common/external-link";

interface NewVersionNoticeProps {
  onDismiss?: () => void;
}

export function NewVersionNotice({ onDismiss }: NewVersionNoticeProps) {
  const [isDismissed, setIsDismissed] = usePersistedState("newVersionNoticeDismissed-2025-07-22", false);

  // Auto-dismiss after October 1, 2025
  const cutoffDate = new Date("2025-10-01");
  const currentDate = new Date();

  if (isDismissed || currentDate >= cutoffDate) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-primary/5 mb-6 rounded-lg p-4 shadow-lg">
      <div className="flex items-start">
        <div className="flex-1">
          <p className="font-medium">Welcome to the new TrendWeight!</p>
          <p className="mt-1 text-sm">
            TrendWeight has been updated with modern code and new features.{" "}
            <ExternalLink href="https://ewal.dev/trendweight-v2-has-launched">See what's new</ExternalLink>
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="hover:bg-primary/10 -my-2 -mr-2 ml-4" aria-label="Dismiss notice">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
