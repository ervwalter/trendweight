import { Link } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";

const HelpLink = () => {
  return (
    <div className="print:hidden">
      <Link to="/math" className="text-muted-foreground hover:text-foreground/80 inline-flex items-center gap-1 italic transition-colors">
        <HelpCircle className="h-5 w-5" />
        <span>What is all this?</span>
      </Link>
    </div>
  );
};

export default HelpLink;
