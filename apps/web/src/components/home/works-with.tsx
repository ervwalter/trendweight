import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { NotePencilIcon } from "@/components/common/note-pencil-icon";

export function WorksWith() {
  return (
    <div className="flex flex-col flex-wrap items-start gap-4 md:flex-row md:items-center">
      {/* Vendor logos */}
      <a href="https://www.withings.com/health-mate" className="text-foreground order-2 w-full hover:no-underline md:w-auto md:pr-6">
        <div className="border-border bg-muted hover:bg-muted flex h-56 w-56 flex-col items-center justify-end rounded-2xl border p-1 pb-4">
          {/* Icon section — same size and position on every card */}
          <div className="flex h-35 items-center justify-center">
            <img src="/withings-app.png" alt="Withings app logo" className="h-35 w-32 object-contain" />
          </div>
          {/* Label section — fixed height, labels grow up from a shared bottom edge */}
          <div className="flex h-12 flex-col items-center justify-end leading-none">
            <span className="text-primary font-bold">Works with</span>
            <div className="text-3xl font-medium tracking-wider">WITHINGS</div>
          </div>
        </div>
      </a>
      <Link to="/log" className="text-foreground order-2 w-full hover:no-underline md:w-auto md:pr-6">
        <div className="border-border bg-muted hover:bg-muted flex h-56 w-56 flex-col items-center justify-end rounded-2xl border p-1 pb-4">
          {/* Icon section — same size and position on every card */}
          <div className="flex h-35 items-center justify-center">
            <div className="bg-manual-tile flex h-28 w-28 items-center justify-center rounded-2xl">
              <NotePencilIcon className="h-20 w-20 text-black/80" accentClassName="fill-primary" />
            </div>
          </div>
          {/* Label section — fixed height, labels grow up from a shared bottom edge */}
          <div className="flex h-13 flex-col items-center justify-end text-2xl leading-none font-medium">
            <div>Built-in</div>
            <div className="mt-1">Weight Log</div>
          </div>
        </div>
      </Link>

      {/* Text content */}
      <div className="order-1 pb-6 text-xl md:order-3 md:pt-6">
        <div className="font-bold">Enter your daily weight how you like...</div>
        <div>
          <Check className="text-success mr-1 inline-block h-5 w-5" /> Withings Smart Scales
        </div>
        <div>
          <Check className="text-success mr-1 inline-block h-5 w-5" /> Withings Health Mate App
        </div>
        <div>
          <Check className="text-success mr-1 inline-block h-5 w-5" /> Built-in Weight Log
        </div>
      </div>
    </div>
  );
}
