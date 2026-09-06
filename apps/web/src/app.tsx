import { useState } from "react";
import { AuthCacheBoundary } from "@/components/auth/auth-cache-boundary";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { ErrorBoundary } from "./components/error-boundary";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
import { useAuth } from "./lib/auth/use-auth";
import { createAppRouter } from "./router";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const clerkLocalization = {
  signIn: {
    start: {
      title: "Welcome",
      titleCombined: "Welcome",
      subtitle: "Log in to your account or create a new one",
      subtitleCombined: "Log in to your account or create a new one",
    },
    emailCode: {
      subtitle: "You should receive a 6-digit code. Enter it below to continue.",
      subtitleCombined: "You should receive a 6-digit code. Enter it below to continue.",
    },
  },
  socialButtonsBlockButtonManyInView: "Continue with {{provider}}",
};

function LoadingApp() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="border-border border-t-muted-foreground h-8 w-8 animate-spin rounded-full border-2" />
    </div>
  );
}

function RoutedApp({ queryClient }: { queryClient: QueryClient }) {
  const [router] = useState(createAppRouter);
  const auth = useAuth();
  if (!auth.isLoaded) return <LoadingApp />;
  return <RouterProvider router={router} context={{ auth, queryClient }} />;
}

function InnerApp() {
  const { isLoaded, userId } = useClerkAuth();
  if (!isLoaded) return <LoadingApp />;

  return (
    <AuthCacheBoundary identity={userId ?? null}>
      {(accountQueryClient) => (
        <>
          <RoutedApp queryClient={accountQueryClient} />
          <ReactQueryDevtools initialIsOpen={false} />
        </>
      )}
    </AuthCacheBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" storageKey="trendweight-theme">
        <ClerkProvider
          publishableKey={publishableKey}
          localization={clerkLocalization}
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
          signInUrl="/login"
          appearance={{
            theme: shadcn,
            cssLayerName: "clerk",
            variables: {
              fontSize: "var(--font-size-base)",
              fontFamily: "inherit",
            },
          }}
        >
          <InnerApp />
          <Toaster />
        </ClerkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
