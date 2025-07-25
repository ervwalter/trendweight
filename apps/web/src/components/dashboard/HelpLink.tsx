import { Link } from "@tanstack/react-router";
import { HiQuestionMarkCircle } from "react-icons/hi";

const HelpLink = () => {
  return (
    <div className="print:hidden">
      <Link to="/math" className="inline-flex items-center gap-1 text-gray-500 italic transition-colors hover:text-gray-700">
        <HiQuestionMarkCircle className="h-5 w-5" />
        <span>What is all this?</span>
      </Link>
    </div>
  );
};

export default HelpLink;
