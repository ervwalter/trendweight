import { useState, Suspense } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiKey } from "@/lib/api/queries";
import { useGenerateApiKey, useRevokeApiKey } from "@/lib/api/mutations";

const createdDateFormatter = new Intl.DateTimeFormat([], {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function ApiKeySectionContent() {
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  // The plaintext key lives only in component state, only right after generating
  const [newKey, setNewKey] = useState<string | null>(null);
  const { data: apiKey } = useApiKey();
  const generateApiKey = useGenerateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const handleGenerate = async () => {
    try {
      const generated = await generateApiKey.mutateAsync();
      setNewKey(generated.apiKey);
      setShowRegenerateConfirm(false);
    } catch (error) {
      console.error("Failed to generate API key:", error);
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeApiKey.mutateAsync();
      setNewKey(null);
      setShowRevokeConfirm(false);
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  };

  const handleCopy = async () => {
    if (newKey) {
      try {
        await navigator.clipboard.writeText(newKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    <>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          An API key lets your own scripts and tools read your data and add weight log entries through the TrendWeight API. Anyone with this key can read and
          change your data, so treat it like a password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {newKey ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Your new API key:</p>
            <div className="relative">
              <Input type="text" value={newKey} readOnly className="bg-muted pr-10 font-mono" onClick={(e) => e.currentTarget.select()} />
              <Button
                type="button"
                onClick={handleCopy}
                variant="ghost"
                size="sm"
                className="absolute top-1/2 right-2 -translate-y-1/2 p-1"
                title={copied ? "Copied!" : "Copy to clipboard"}
              >
                {copied ? (
                  <svg className="text-success h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </Button>
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
