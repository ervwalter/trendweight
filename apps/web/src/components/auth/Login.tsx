import { SignIn } from "@clerk/clerk-react";
import { NewVersionNotice } from "../notices/NewVersionNotice";
import { PrivacyPolicyLink } from "./PrivacyPolicyLink";

export function Login() {
  return (
    <div className="mx-auto max-w-xl md:py-12">
      <NewVersionNotice />

      <SignIn routing="hash" />

      <PrivacyPolicyLink />
    </div>
  );
}
