import type { ReactNode } from "react";

interface QuestionProps {
  title: string;
  children: ReactNode;
}

export function Question({ title, children }: QuestionProps) {
  return (
    <div>
      <dt className="max-w-[42rem] text-lg leading-6 font-semibold text-gray-900">{title}</dt>
      <dd className="prose prose-gray mt-2 text-base text-gray-600">{children}</dd>
    </div>
  );
}
