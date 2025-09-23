import { ExternalLink } from "@/components/common/external-link";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClerk } from "@clerk/clerk-react";
import { ExternalLink as ExternalLinkIcon } from "lucide-react";

export function AccountSecuritySection() {
  const clerk = useClerk();

  // Use Clerk's built-in method if available, otherwise fallback
  const profileUrl = clerk?.buildUserProfileUrl?.() || "https://accounts.trendweight.com/user";
  const securityUrl = profileUrl.replace("/user", "/user/security");

  return (
    <>
      <CardHeader>
        <CardTitle>Account Security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          TrendWeight uses Clerk to handle authentication and account security. The links below will open pages in a new tab where you can manage your account
          details and security settings.
        </p>
        <div className="border-border flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h4 className="text-foreground font-medium">Email & Social Logins</h4>
            <p className="text-muted-foreground text-sm">
              You can use the account profile page to update your email address and to add or remove social login methods (Google, Microsoft, Apple)
            </p>
          </div>
          <Button asChild variant="default" size="sm">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              Open Account Profile
              <ExternalLinkIcon className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>

        <div className="border-border flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <h4 className="text-foreground font-medium">Passkeys</h4>
            <p className="text-muted-foreground text-sm">
              On the security page you can add a <ExternalLink href="https://developers.google.com/identity/passkeys">passkey</ExternalLink> for easy and secure
              login. Passkeys let you sign in without having to receive and enter a code from your email, and without relying on social logins like Google,
              Apple, or Microsoft.
            </p>
          </div>
          <Button asChild variant="default" size="sm">
            <a href={securityUrl} target="_blank" rel="noopener noreferrer">
              Open Security Settings
              <ExternalLinkIcon className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </CardContent>
    </>
  );
}
