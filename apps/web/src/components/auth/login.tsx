import { NewVersionNotice } from "@/components/notices/new-version-notice";
import { SignIn } from "@clerk/clerk-react";

const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-forground font-medium px-6 py-3 rounded-md",
    formFieldInput: "px-4 py-3 max-h-none leading-normal",
    logoBox: "hidden",
    headerTitle: "text-2xl font-bold text-foreground",
    socialButtons: "grid-cols-1 gap-2 md:gap-3 w-full pb-2",
    socialButtonsBlockButton: "py-3 px-6",
    lastAuthenticationStrategyBadge: "hidden",
  },
  layout: {
    socialButtonsVariant: "blockButton" as const,
    privacyPageUrl: "/privacy",
    unsafe_disableDevelopmentModeWarnings: true,
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
