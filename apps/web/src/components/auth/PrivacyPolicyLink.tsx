import { Link } from "@tanstack/react-router";

export function PrivacyPolicyLink() {
  return (
    <p className="mt-8 text-center text-sm text-gray-600">
      By continuing, you agree to our{" "}
      <Link to="/privacy" className="text-brand-600 hover:text-brand-700 underline">
        Privacy Policy
      </Link>
    </p>
  );
}
