import { useState, Suspense } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/common/copy-button";
import { ExternalLink } from "@/components/common/external-link";
import { Input } from "@/components/ui/input";
import { useApiKey } from "@/lib/api/queries";
import { useGenerateApiKey, useRevokeApiKey } from "@/lib/api/mutations";
import { useToast } from "@/lib/hooks/use-toast";

const createdDateFormatter = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function ApiKeySectionContent() {
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  // The plaintext key lives only in component state, only right after generating
  const [newKey, setNewKey] = useState<string | null>(null);
  const { data: apiKey } = useApiKey();
  const generateApiKey = useGenerateApiKey();
  const revokeApiKey = useRevokeApiKey();
  const { showToast } = useToast();

  const handleGenerate = async () => {
    try {
      const generated = await generateApiKey.mutateAsync();
      setNewKey(generated.apiKey);
    } catch {
      showToast({ title: "Something went wrong", description: "Your API key could not be generated. Please try again.", variant: "error" });
    } finally {
      setShowRegenerateConfirm(false);
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeApiKey.mutateAsync();
      setNewKey(null);
    } catch {
      showToast({ title: "Something went wrong", description: "Your API key could not be revoked. Please try again.", variant: "error" });
    } finally {
      setShowRevokeConfirm(false);
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          An API key lets your own scripts and tools read your data and add weight log entries through the TrendWeight API. Anyone with this key can read and
          change your data, so treat it like a password. See the <ExternalLink href="/api-docs/v1">API reference</ExternalLink> for the available endpoints.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {newKey ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Your new API key:</p>
            <div className="relative">
              <Input type="text" value={newKey} readOnly className="bg-muted pr-10 font-mono" onClick={(e) => e.currentTarget.select()} />
              <CopyButton value={newKey} />
            </div>
            <p className="text-muted-foreground text-sm">Copy it now — for your security, it won't be shown again.</p>
          </div>
        ) : apiKey?.exists ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-sm">sk-…{apiKey.suffix}</p>
              {apiKey.createdAt && <p className="text-muted-foreground text-sm">Created {createdDateFormatter.format(new Date(apiKey.createdAt))}</p>}
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <Button type="button" onClick={() => setShowRegenerateConfirm(true)} variant="outline" size="sm" disabled={generateApiKey.isPending}>
                {generateApiKey.isPending ? "Generating..." : "Regenerate"}
              </Button>
              <Button type="button" onClick={() => setShowRevokeConfirm(true)} variant="destructive" size="sm" disabled={revokeApiKey.isPending}>
                {revokeApiKey.isPending ? "Revoking..." : "Revoke"}
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" onClick={handleGenerate} variant="default" size="sm" disabled={generateApiKey.isPending}>
            {generateApiKey.isPending ? "Generating..." : "Generate API Key"}
          </Button>
        )}
      </CardContent>

      <ConfirmDialog
        open={showRegenerateConfirm}
        onOpenChange={setShowRegenerateConfirm}
        title="Regenerate API Key?"
        description={
          <div className="space-y-2">
            <p>This will permanently invalidate your current API key.</p>
            <p>Any scripts or tools using the old key will stop working until you update them with the new key.</p>
          </div>
        }
        confirmText="Regenerate"
        destructive
        onConfirm={handleGenerate}
      />

      <ConfirmDialog
        open={showRevokeConfirm}
        onOpenChange={setShowRevokeConfirm}
        title="Revoke API Key?"
        description={
          <div className="space-y-2">
            <p>This will permanently invalidate your API key.</p>
            <p>Any scripts or tools using it will stop working. You can generate a new key at any time.</p>
          </div>
        }
        confirmText="Revoke"
        destructive
        onConfirm={handleRevoke}
      />
    </>
  );
}

export function ApiKeySection() {
  return (
    <Suspense
      fallback={
        <>
          <CardHeader>
            <CardTitle>API Key</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Loading API key settings...</p>
          </CardContent>
        </>
      }
    >
      <ApiKeySectionContent />
    </Suspense>
  );
}
