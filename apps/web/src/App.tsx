import "@bprogress/core/css";
import { ProgressProvider } from "@bprogress/react";
import { ClerkLoaded, ClerkLoading, ClerkProvider } from "@clerk/clerk-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "@tanstack/react-router";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContextProvider } from "./components/ui/ToastProvider";
import { BackgroundQueryProgress } from "./lib/progress/BackgroundQueryProgress";
import "./lib/progress/progress.css";
import { ProgressManager } from "./lib/progress/ProgressManager";
import { queryClient } from "./lib/queryClient";
import { setupVersionSkewHandler } from "./lib/version-skew/setupVersionSkewHandler";
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
};

function App() {
  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={publishableKey}
        localization={clerkLocalization}
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        signInUrl="/login"
        appearance={{
          cssLayerName: "clerk",
          variables: {
            colorPrimary: "var(--color-brand-500)",
            fontSize: "var(--font-size-base)",
            fontFamily: "inherit",
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <ToastContextProvider>
            <ProgressProvider color="#eef5ff" height="3px" delay={250} spinnerPosition="top-right">
              <ProgressManager />
              <BackgroundQueryProgress />
              <ClerkLoading>
                <div className="flex h-screen items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-400" />
                </div>
              </ClerkLoading>
              <ClerkLoaded>
                <RouterProvider router={router} />
              </ClerkLoaded>
            </ProgressProvider>
            <ReactQueryDevtools initialIsOpen={false} />
          </ToastContextProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

export default App;
