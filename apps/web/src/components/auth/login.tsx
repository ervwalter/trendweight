import { SignIn } from "@clerk/react";

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
  options: {
    socialButtonsVariant: "blockButton" as const,
    privacyPageUrl: "/privacy",
    unsafe_disableDevelopmentModeWarnings: true,
  },
};

interface LoginProps {
  /** Same-origin path to return to after login; falls back to the app-wide default (/dashboard) */
  redirectTo?: string;
}

export function Login({ redirectTo }: LoginProps) {
  return (
    <div className="mx-auto max-w-xl md:py-12">
      <SignIn routing="hash" appearance={clerkAppearance} forceRedirectUrl={redirectTo} signUpForceRedirectUrl={redirectTo} />
    </div>
  );
}
