import { CheckCircle } from "lucide-react";
import { ExternalLink } from "@/components/common/external-link";
import { Heading } from "@/components/common/heading";
import { FITBIT_ENDED_NOTE, type ProviderMetadata } from "@/lib/utils/provider-display";
import { ProviderActions, type ProviderActionState } from "./provider-actions";

interface ProviderCardProps {
  provider: ProviderMetadata;
  actions: ProviderActionState;
}

/** Full-width provider tile used on the link page */
export function ProviderCard({ provider, actions }: ProviderCardProps) {
  return (
    <div className="border-border bg-muted relative rounded-lg border p-4 @sm:p-6">
      {actions.isConnected && (
        <div className="absolute top-4 right-4">
          <CheckCircle className="text-success h-5 w-5 @sm:h-6 @sm:w-6" />
        </div>
      )}
      <Heading level={2}>{provider.displayName}</Heading>
      <div className="flex flex-col gap-4 @md:flex-row @md:gap-6">
        <div className="flex-shrink-0 self-center @md:self-start">
          <img src={provider.logo} alt={`${provider.name} logo`} className="h-auto w-24 @sm:w-32 @md:w-48" />
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground mb-3 text-sm @sm:text-base">{actions.isShutOff ? FITBIT_ENDED_NOTE : provider.description}</p>
          {provider.linkUrl && provider.linkText && (
            <p className="text-muted-foreground mb-3 text-sm @sm:text-base">
              <ExternalLink href={provider.linkUrl} className="font-medium">
                {provider.linkText}
              </ExternalLink>
            </p>
          )}
          <p className="text-muted-foreground mb-4 text-xs italic @sm:text-sm">
            {provider.note}
            {provider.learnMoreUrl && (
              <>
                {" "}
                <ExternalLink href={provider.learnMoreUrl}>Read more about what's happening</ExternalLink>
              </>
            )}
          </p>
          <div className="flex flex-col gap-2 @sm:flex-row">
            <ProviderActions provider={provider} variant="link" {...actions} />
          </div>
        </div>
      </div>
    </div>
  );
}
