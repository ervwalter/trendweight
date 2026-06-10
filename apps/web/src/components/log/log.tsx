import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/common/heading";
import { ManualReadingDialog } from "./manual-reading-dialog";
import { ManualReadingsList } from "./manual-readings-list";

export function LogWeight() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="mx-auto max-w-xl md:mx-0">
      <div className="flex items-start justify-between gap-4">
        <Heading level={1}>Your Weight Log</Heading>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </div>
      <p className="text-muted-foreground mb-6">
        Weights you've entered yourself. They appear in your charts and trends right alongside readings from a connected scale.
      </p>

      <ManualReadingsList />

      <ManualReadingDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
