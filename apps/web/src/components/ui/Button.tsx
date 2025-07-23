import { type ButtonHTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";
import { Slot } from "@radix-ui/react-slot";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "success" | "destructive" | "warning";
  size?: "sm" | "md" | "lg" | "xl";
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", size = "md", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-colors rounded-md disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

  const variantStyles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800",
    secondary: "bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 active:bg-gray-100",
    ghost: "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
    success: "bg-green-600 text-white hover:bg-green-700 active:bg-green-800",
    destructive: "bg-red-700 text-white hover:bg-red-800 active:bg-red-900",
    warning: "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
    xl: "px-6 py-6 text-xl md:py-7 lg:text-2xl",
  };

  return <Comp ref={ref} className={twMerge(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...props} />;
});

Button.displayName = "Button";
