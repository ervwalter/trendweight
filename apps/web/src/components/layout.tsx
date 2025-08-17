import { Suspense, type ReactNode } from "react";
import { pageTitle } from "@/lib/utils/page-title";
import { Container } from "./container";
import { Footer } from "./footer";
import { Header } from "./header";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  suspenseFallback?: ReactNode;
  noIndex?: boolean;
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  );
}

export function Layout({ children, title, suspenseFallback, noIndex }: LayoutProps) {
  return (
    <>
      <title>{pageTitle(title)}</title>
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <div className="flex min-h-screen flex-col">
        <Header />
        <Container as="main" className="flex-grow py-4 md:py-6">
          <Suspense fallback={suspenseFallback || <LoadingFallback />}>{children}</Suspense>
        </Container>
        <Footer />
      </div>
    </>
  );
}
