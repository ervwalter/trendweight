import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/80",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 active:bg-destructive/80",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-link underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground shadow-xs hover:bg-success/90 active:bg-success/80",
        warning: "bg-warning text-warning-foreground shadow-xs hover:bg-warning/90 active:bg-warning/80",
      },
      size: {
        default: "px-6 py-3 has-[>svg]:px-4",
        sm: "px-4 py-2 rounded-md gap-1.5 has-[>svg]:px-3",
        lg: "px-8 py-4 rounded-md has-[>svg]:px-5",
        xl: "px-8 py-6 text-xl md:py-7 lg:text-2xl",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
