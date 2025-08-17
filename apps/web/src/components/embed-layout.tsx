import { Suspense, useEffect, type ReactNode } from "react";
import { pageTitle } from "../lib/utils/page-title";
import { useEmbedParams } from "../lib/hooks/use-embed-params";

interface EmbedLayoutProps {
  children: ReactNode;
  title?: string;
  suspenseFallback?: ReactNode;
  noIndex?: boolean;
}

function LoadingFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="border-border h-8 w-8 animate-spin rounded-full border-2 border-t-gray-400" />
    </div>
  );
}

export function EmbedLayout({ children, title, suspenseFallback, noIndex }: EmbedLayoutProps) {
  const { dark, width } = useEmbedParams();

  // Override dark mode based on URL parameter
  useEffect(() => {
    if (dark !== undefined) {
      const htmlElement = document.documentElement;
      if (dark) {
        htmlElement.classList.add("dark");
      } else {
        htmlElement.classList.remove("dark");
      }
    }
  }, [dark]);

  const containerStyle = width ? { maxWidth: `${width}px` } : undefined;

  return (
    <>
      <title>{pageTitle(title)}</title>
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <div className="min-h-screen" style={containerStyle}>
        <Suspense fallback={suspenseFallback || <LoadingFallback />}>{children}</Suspense>
      </div>
    </>
  );
}
