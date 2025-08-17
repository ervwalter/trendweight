import * as React from "react";
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";

const ToggleGroupContext = React.createContext<VariantProps<typeof toggleVariants>>({
  size: "default",
  variant: "default",
});

type ToggleGroupProps = {
  className?: string;
  variant?: VariantProps<typeof toggleVariants>["variant"];
  size?: VariantProps<typeof toggleVariants>["size"];
  children: React.ReactNode;
  type?: "single"; // Always single mode now
  onValueChange?: (value: string) => void;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  rovingFocus?: boolean;
  loop?: boolean;
  orientation?: "horizontal" | "vertical";
  dir?: "ltr" | "rtl";
} & Omit<React.ComponentProps<"div">, "onValueChange" | "value" | "defaultValue">;

function ToggleGroup({ className, variant = "outline", size = "default", children, onValueChange, value, defaultValue, ...props }: ToggleGroupProps) {
  const handleValueChange = React.useCallback(
    (value: string) => {
      // Prevent deselection - ignore empty values (radio button behavior)
      if (value && value !== "") {
        onValueChange?.(value);
      }
    },
    [onValueChange],
  );

  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      className={cn("group/toggle-group inline-flex items-center rounded-md", className)}
      type="single"
      value={value}
      defaultValue={defaultValue}
      onValueChange={handleValueChange}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>{children}</ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  const context = React.useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        "rounded-none first:rounded-l-md last:rounded-r-md",
        "focus:z-10 focus-visible:z-10",
        // Remove duplicate borders between items
        "[&:not(:first-child)]:-ml-px",
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };
