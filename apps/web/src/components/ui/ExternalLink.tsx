import type { ReactNode } from "react";
import { HiExternalLink } from "react-icons/hi";
import { twMerge } from "tailwind-merge";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function ExternalLink({ href, children, className }: ExternalLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={twMerge("text-brand-600 hover:text-brand-700 underline", className)}>
      {children}
      <HiExternalLink className="ml-0.5 inline-block h-3 w-3 align-baseline" />
    </a>
  );
}
