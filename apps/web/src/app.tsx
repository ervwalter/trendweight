import "@bprogress/core/css";
import { ClerkProvider } from "@clerk/clerk-react";
import { shadcn } from "@clerk/themes";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { ErrorBoundary } from "./components/error-boundary";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
import { useAuth } from "./lib/auth/use-auth";
import "./lib/progress/progress.css";
import { queryClient } from "./lib/query-client";
import { setupVersionSkewHandler } from "./lib/version-skew/setup-version-skew-handler";
import { router } from "./router";

// Set up version skew handling
setupVersionSkewHandler();

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

function InnerApp() {
  const auth = useAuth();
  if (!auth.isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="border-border h-8 w-8 animate-spin rounded-full border-2 border-t-gray-400" />
      </div>
    );
  }

  return <RouterProvider router={router} context={{ auth }} />;
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
            baseTheme: shadcn,
            cssLayerName: "clerk",
            variables: {
              colorPrimary: "var(--color-brand-500)",
              fontSize: "var(--font-size-base)",
              fontFamily: "inherit",
            },
          }}
        >
          <QueryClientProvider client={queryClient}>
            <InnerApp />
            <Toaster />
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </ClerkProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
