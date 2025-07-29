import { SignIn } from "@clerk/clerk-react";
import { NewVersionNotice } from "../notices/NewVersionNotice";
import { PrivacyPolicyLink } from "./PrivacyPolicyLink";

const clerkAppearance = {
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-none",
    card: "shadow-none rounded-none px-1 pt-2",
    formButtonPrimary: "bg-brand-500 hover:bg-brand-600 text-white font-medium px-6 py-3 rounded-md",
    formFieldInput: "px-4 py-3 max-h-none leading-normal",
    logoBox: "hidden",
    headerTitle: "text-2xl font-bold text-gray-900",
    socialButtons: "grid-cols-1 gap-2 md:gap-3 w-full pb-2",
    socialButtonsBlockButton: "py-3 px-6",
    footerAction__signIn: "hidden",
    footer: "[&>div]:border-transparent [&>div]:rounded-xl [&>div]:bg-brand-50 bg-none",
  },
  layout: {
    socialButtonsVariant: "blockButton" as const,
    // unsafe_disableDevelopmentModeWarnings: true,
  },
};

export function Login() {
  return (
    <div className="mx-auto max-w-xl md:py-12">
      <NewVersionNotice />

      <SignIn routing="hash" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard" signInUrl="/login" appearance={clerkAppearance} />

      <PrivacyPolicyLink />
    </div>
  );
}
