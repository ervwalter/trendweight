import type { ReactNode } from "react";

interface QuestionProps {
  title: string;
  children: ReactNode;
}

export function Question({ title, children }: QuestionProps) {
  return (
    <div>
      <dt className="text-foreground max-w-[42rem] text-lg leading-6 font-semibold">{title}</dt>
      <dd className="prose prose-gray text-muted-foreground mt-2 text-base">{children}</dd>
    </div>
  );
}
