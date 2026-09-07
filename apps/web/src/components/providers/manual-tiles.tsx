import { CheckCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/common/heading";
import { NotePencilIcon } from "@/components/common/note-pencil-icon";

interface ManualTileProps {
  /** Whether the user has logged at least one weight by hand */
  hasEntries: boolean;
}

/** Manual entry presented like a provider card on the link page */
export function ManualCard({ hasEntries }: ManualTileProps) {
  return (
    <div className="border-border bg-muted relative rounded-lg border p-4 @sm:p-6">
      {hasEntries && (
        <div className="absolute top-4 right-4">
          <CheckCircle className="text-success h-5 w-5 @sm:h-6 @sm:w-6" />
        </div>
      )}
      <Heading level={2}>Log It Yourself</Heading>
      <div className="flex flex-col gap-4 @md:flex-row @md:gap-6">
        <div className="flex-shrink-0 self-center @md:self-start">
          <div className="bg-manual-tile flex h-24 w-24 items-center justify-center rounded-2xl @sm:h-32 @sm:w-32 @md:h-48 @md:w-48">
            <NotePencilIcon className="h-16 w-16 text-black/80 @sm:h-22 @sm:w-22 @md:h-32 @md:w-32" accentClassName="fill-primary" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground mb-3 text-sm @sm:text-base">
            No smart scale? No problem. Type in your weight whenever you weigh in, and TrendWeight gives you the same trend analysis, charts, and stats as a
            connected scale.
          </p>
          <p className="text-muted-foreground mb-4 text-xs italic @sm:text-sm">Your weight log works alongside connected scales too — you can mix and match.</p>
          <Button asChild variant="success" size="sm" className="@sm:px-6">
            <Link to="/log">Log Your Weight</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Manual entry alongside the other connections on the settings page */
export function ManualRow({ hasEntries }: ManualTileProps) {
  return (
    <div className="border-border flex flex-col space-y-3 rounded-lg border p-4 @sm:flex-row @sm:items-center @sm:justify-between @sm:space-y-0">
      <div className="flex items-center space-x-3">
        <div className="bg-manual-tile flex h-10 w-10 items-center justify-center rounded-md">
          <NotePencilIcon className="h-7 w-7 text-black/80" accentClassName="fill-primary" />
        </div>
        <div>
          <Heading level={3} className="text-foreground">
            Weight Log
          </Heading>
          <p className="text-muted-foreground text-sm">{hasEntries ? "Weights you've entered yourself" : "No smart scale needed — log weights yourself"}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 self-end @sm:self-auto">
        <Button asChild variant="default" size="sm">
          <Link to="/log">Edit</Link>
        </Button>
      </div>
    </div>
  );
}
