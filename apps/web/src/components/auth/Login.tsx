import { SignIn } from "@clerk/clerk-react";
import { NewVersionNotice } from "../notices/NewVersionNotice";

const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-none",
    card: "shadow-none rounded-none px-1 pt-2",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white font-medium px-6 py-3 rounded-md",
    formFieldInput: "px-4 py-3 max-h-none leading-normal",
    logoBox: "hidden",
    headerTitle: "text-2xl font-bold text-foreground",
    socialButtons: "grid-cols-1 gap-2 md:gap-3 w-full pb-2",
    socialButtonsBlockButton: "py-3 px-6",
    footer: "[&>div]:border-transparent [&>div]:rounded-xl [&>div]:bg-muted bg-none",
  },
  layout: {
    socialButtonsVariant: "blockButton" as const,
    privacyPageUrl: "/privacy",
    // unsafe_disableDevelopmentModeWarnings: true,
  },
};

export function Login() {
  return (
    <div className="mx-auto max-w-xl md:py-12">
      <NewVersionNotice />
      <SignIn routing="hash" appearance={clerkAppearance} />
    </div>
  );
}
