import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";

interface SortToggleProps {
  sortNewestFirst: boolean;
  onSortChange: (newestFirst: boolean) => void;
}

export function SortToggle({ sortNewestFirst, onSortChange }: SortToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={sortNewestFirst ? "newest" : "oldest"}
      onValueChange={(value) => onSortChange(value === "newest")}
      defaultValue="newest"
      aria-label="Sort Order"
    >
      <ToggleGroupItem value="newest">Newest First</ToggleGroupItem>
      <ToggleGroupItem value="oldest">Oldest First</ToggleGroupItem>
    </ToggleGroup>
  );
}
