import type { ElementType, ReactNode } from "react";
import clsx from "clsx";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

export function Container({ children, className, as: Component = "div" }: ContainerProps) {
  return (
    <Component
      className={clsx(
        "mx-auto w-full px-4",
        "sm:max-w-[640px] sm:px-4",
        "md:max-w-[768px] md:px-4",
        "lg:max-w-[1024px] lg:px-4",
        "xl:max-w-[1280px] xl:px-4",
        "print:max-w-none print:px-0",
        className,
      )}
    >
      {children}
    </Component>
  );
}
