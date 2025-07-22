import { Suspense, type ReactNode } from "react";
import { pageTitle } from "../lib/utils/pageTitle";
import { Container } from "./Container";
import { Footer } from "./Footer";
import { Header } from "./Header";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  suspenseFallback?: ReactNode;
}

function LoadingFallback() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
}

export function Layout({ children, title, suspenseFallback }: LayoutProps) {
  return (
    <>
      <title>{pageTitle(title)}</title>
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
