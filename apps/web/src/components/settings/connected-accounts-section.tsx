import { ProviderList } from "@/components/providers/provider-list";
import { CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export function ConnectedAccountsSection() {
  return (
    <>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
      </CardHeader>
      <CardContent>
        <ProviderList variant="settings" showHeader={false} />
      </CardContent>
    </>
  );
}
