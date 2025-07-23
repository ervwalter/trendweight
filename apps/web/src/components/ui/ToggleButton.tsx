import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export interface ToggleButtonProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "subtle";
}

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(({ value, children, className, variant = "default" }, ref) => {
  const baseStyles = "px-3 py-1.5 text-sm font-medium transition-all focus:outline-none whitespace-nowrap";

  const variantStyles = {
    default:
      "border border-gray-300 bg-white text-gray-800 data-[state=on]:bg-brand-500 data-[state=on]:border-brand-500 data-[state=on]:text-white md:hover:bg-gray-200 md:hover:text-gray-800 md:data-[state=on]:hover:bg-brand-800 md:data-[state=on]:hover:text-white first:rounded-l-md last:rounded-r-md -ml-px first:ml-0",
    subtle:
      "relative text-gray-700 hover:text-gray-900 focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-gray-100 data-[state=on]:bg-white data-[state=on]:text-gray-900 data-[state=on]:shadow-sm rounded-md",
  };

  return (
    <ToggleGroup.Item ref={ref} value={value} className={twMerge(baseStyles, variantStyles[variant], className)}>
      {children}
    </ToggleGroup.Item>
  );
});

ToggleButton.displayName = "ToggleButton";
