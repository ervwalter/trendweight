import { Button } from "@/components/ui/button";

interface SocialLoginButtonsProps {
  onSocialLogin: (provider: "google" | "microsoft" | "apple") => void;
}

export function SocialLoginButtons({ onSocialLogin }: SocialLoginButtonsProps) {
  return (
    <div className="space-y-3">
      <Button onClick={() => onSocialLogin("google")} variant="outline" size="lg" className="w-full justify-start gap-4">
        <img src="/google-logo-NePEveMl.svg" alt="Google" className="h-5 w-5" />
        <span className="flex-1 text-left">Continue with Google</span>
      </Button>

      <Button onClick={() => onSocialLogin("microsoft")} variant="outline" size="lg" className="w-full justify-start gap-4">
        <img src="/microsoft-logo-BUXxQnXH.svg" alt="Microsoft" className="h-5 w-5" />
        <span className="flex-1 text-left">Continue with Microsoft</span>
      </Button>

      <Button onClick={() => onSocialLogin("apple")} variant="outline" size="lg" className="w-full justify-start gap-4">
        <img src="/apple-logo-vertically-balanced-rwLdlt8P.svg" alt="Apple" className="h-5 w-5" />
        <span className="flex-1 text-left">Continue with Apple</span>
      </Button>
    </div>
  );
}
