import { Link } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotePencilIcon } from "@/components/common/note-pencil-icon";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ManualReadingDialog } from "./manual-reading-dialog";

interface QuickLogButtonProps {
  className?: string;
}

/** Dashboard quick-add: split button — log a weight, or jump to the manual readings page */
export function QuickLogButton({ className }: QuickLogButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("flex", className)}>
        <Button variant="outline" size="sm" className="rounded-r-none" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Log Weight
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="-ml-px rounded-l-none px-1.5" aria-label="More weight log options">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/log">
                <NotePencilIcon className="h-4 w-4" />
                Edit your weight log
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ManualReadingDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
