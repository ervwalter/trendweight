import { ProviderList } from "../providers/ProviderList";
import { CardHeader, CardContent, CardTitle } from "../ui/card";

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
