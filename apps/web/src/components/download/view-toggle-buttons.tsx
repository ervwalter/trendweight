import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import type { ViewType } from "./types";
import type { ProviderLink } from "../../lib/api/types";
import { getProviderDisplayName } from "../../lib/utils/provider-display";

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
    <ToggleGroup
      type="single"
      value={viewType}
      onValueChange={(value) => {
        if (value && value !== "") onViewChange(value);
      }}
      defaultValue="computed"
      aria-label="View Type"
    >
      <ToggleGroupItem value="computed">Computed Values</ToggleGroupItem>
      {sortedProviders.map((provider) => (
        <ToggleGroupItem key={provider.provider} value={provider.provider}>
          {getProviderDisplayName(provider.provider)}
          {provider.provider !== "legacy" && " Data"}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
