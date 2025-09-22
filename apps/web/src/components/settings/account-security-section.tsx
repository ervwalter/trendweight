import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import { useClerk } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <div className="border-border flex items-center justify-between space-x-4 rounded-lg border p-4">
          <div className="flex-1 pr-4">
            <h4 className="text-foreground font-medium">Account Profile</h4>
            <p className="text-muted-foreground text-sm">
              You can use the profile page to update your email address, add or remove social login methods (Google, Microsoft, Apple), and manage your basic
              account information.
            </p>
          </div>
          <Button asChild variant="default" size="sm">
            <a href={profileUrl} target="_blank" rel="noopener noreferrer">
              Open Account Profile
              <ExternalLinkIcon className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>

        <div className="border-border flex items-center justify-between space-x-4 rounded-lg border p-4">
          <div className="flex-1 pr-4">
            <h4 className="text-foreground font-medium">Security Settings</h4>
            <p className="text-muted-foreground text-sm">
              On the security page you can add passkeys for secure login, change your password (or add one if you signed up without one), and manage your
              logged-in devices.
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
