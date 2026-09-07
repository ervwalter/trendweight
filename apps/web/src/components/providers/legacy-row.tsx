import { Button } from "@/components/ui/button";
import { Heading } from "@/components/common/heading";
import { getProviderDisplayName } from "@/lib/utils/provider-display";

interface LegacyRowProps {
  /** Legacy data is hidden from charts and exports */
  isDisabled: boolean;
  isPending: boolean;
  onToggle: () => void;
}

/** Settings row for imported classic TrendWeight data, which can only be shown or hidden */
export function LegacyRow({ isDisabled, isPending, onToggle }: LegacyRowProps) {
  const label = isPending ? (isDisabled ? "Enabling..." : "Disabling...") : isDisabled ? "Enable" : "Disable";

  return (
    <div className="border-border rounded-lg border p-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-3 @sm:flex-row @sm:items-center @sm:justify-between @sm:space-y-0">
          <div className="flex items-center space-x-3">
            <img src="/legacy-logo.png" alt="Legacy Data" className="h-10 w-10" />
            <div>
              <Heading level={3} className="text-foreground">
                {getProviderDisplayName("legacy")}
              </Heading>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end @sm:self-auto">
            <Button type="button" onClick={onToggle} disabled={isPending} variant={isDisabled ? "default" : "destructive"} size="sm">
              {label}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">
            Historical weight data imported from classic TrendWeight. This data was migrated from your previous account and provides your complete weight
            history.
          </p>
          <p className="text-muted-foreground text-xs italic">
            This data cannot be synced or updated. You can enable or disable its visibility in your charts and exports.
          </p>
        </div>
      </div>
    </div>
  );
}
