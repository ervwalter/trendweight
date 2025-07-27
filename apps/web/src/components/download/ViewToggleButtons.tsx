import { ToggleButton } from "../ui/ToggleButton";
import { ToggleButtonGroup } from "../ui/ToggleButtonGroup";
import type { ViewType } from "./types";
import type { ProviderLink } from "../../lib/api/types";
import { getProviderDisplayName } from "../../lib/utils/providerDisplay";

interface ViewToggleButtonsProps {
  viewType: ViewType;
  onViewChange: (view: ViewType) => void;
  providerLinks: ProviderLink[];
}

export function ViewToggleButtons({ viewType, onViewChange, providerLinks }: ViewToggleButtonsProps) {
  const connectedProviders = providerLinks.filter((link) => link.hasToken && !link.isDisabled);

  // Sort providers to ensure legacy is always last
  const sortedProviders = [...connectedProviders].sort((a, b) => {
    if (a.provider === "legacy") return 1;
    if (b.provider === "legacy") return -1;
    return 0;
  });

  return (
    <ToggleButtonGroup value={viewType} onChange={onViewChange} defaultValue="computed" aria-label="View Type">
      <ToggleButton value="computed">Computed Values</ToggleButton>
      {sortedProviders.map((provider) => (
        <ToggleButton key={provider.provider} value={provider.provider}>
          {getProviderDisplayName(provider.provider)}
          {provider.provider !== "legacy" && " Data"}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
