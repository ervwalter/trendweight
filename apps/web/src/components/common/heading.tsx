import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  className?: string;
  display?: boolean; // Use display font for h1
}

export function Heading({ level, children, className = "", display = false, ...props }: HeadingProps) {
  const baseStyles = {
    1: `text-2xl sm:text-3xl ${display ? "font-display" : ""} font-bold mb-4`,
    2: "text-xl sm:text-2xl font-semibold mb-4",
    3: "text-lg sm:text-xl font-semibold mb-3",
    4: "text-base sm:text-lg font-semibold mb-2",
    5: "text-base font-semibold mb-2",
    6: "text-base font-semibold mb-2",
  };

  const combinedClassName = twMerge(baseStyles[level], className);

  const headingProps = {
    className: combinedClassName,
    ...props,
    children,
  };

  switch (level) {
    case 1:
      return <h1 {...headingProps} />;
    case 2:
      return <h2 {...headingProps} />;
    case 3:
      return <h3 {...headingProps} />;
    case 4:
      return <h4 {...headingProps} />;
    case 5:
      return <h5 {...headingProps} />;
    case 6:
      return <h6 {...headingProps} />;
  }
}
