import type { ReactNode } from "react";
import { Heading } from "@/components/common/heading";

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <Heading level={1} className="mb-8" display>
        Settings
      </Heading>
      {children}
    </div>
  );
}
