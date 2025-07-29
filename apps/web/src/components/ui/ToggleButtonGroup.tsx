import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { twMerge } from "tailwind-merge";
import { Children, cloneElement, isValidElement } from "react";
import type { ToggleButtonProps } from "./ToggleButton";

export interface ToggleButtonGroupProps {
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  children: React.ReactNode;
  "aria-label"?: string;
  className?: string;
  variant?: "default" | "subtle";
}

export const ToggleButtonGroup = ({
  value,
  onChange,
  defaultValue,
  children,
  "aria-label": ariaLabel,
  className,
  variant = "default",
}: ToggleButtonGroupProps) => {
  const baseStyles = "inline-flex";
  const variantStyles = {
    default: "",
    subtle: "rounded-lg bg-gray-100 p-1 gap-1",
  };

  // Pass variant prop to all ToggleButton children
  const childrenWithProps = Children.map(children, (child) => {
    if (isValidElement(child) && child.props && typeof child.props === "object" && "value" in child.props) {
      return cloneElement(child, { variant } as Partial<ToggleButtonProps>);
    }
    return child;
  });

  // Ensure radio button behavior - prevent deselecting current value
  const handleValueChange = (newValue: string) => {
    // Only allow changes if a different value is selected
    if (newValue && newValue !== value && onChange) {
      onChange(newValue);
    }
  };

  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={handleValueChange}
      defaultValue={defaultValue}
      aria-label={ariaLabel}
      className={twMerge(baseStyles, variantStyles[variant], className)}
    >
      {childrenWithProps}
    </ToggleGroup.Root>
  );
};
