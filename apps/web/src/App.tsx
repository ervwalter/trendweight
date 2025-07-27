import "@bprogress/core/css";
import { ProgressProvider } from "@bprogress/react";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-react";
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

const clerkAppearance = {
  cssLayerName: "clerk",
  elements: {
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-2 border-gray-100",
    formButtonPrimary: "bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 rounded-md",
    logoBox: "hidden", // Hide Clerk logo
    headerTitle: "text-2xl font-bold text-gray-900",
    socialButtons: "grid-cols-1 gap-2 w-full",
    socialButtonsBlockButton: "py-2.5",
  },
  variables: {
    colorPrimary: "var(--color-brand-500)",
    fontSize: "var(--font-size-base)",
    fontFamily: "inherit",
  },
  layout: {
    socialButtonsVariant: "blockButton" as const,
    unsafe_disableDevelopmentModeWarnings: true,
  },
};

const clerkLocalization = {
  signIn: {
    start: {
      titleCombined: "Welcome",
      subtitleCombined: "Log in to your account or create a new one",
    },
    emailCode: {
      subtitle: "You should receive a 6-digit code. Enter it below to continue.",
    },
  },
};

function App() {
  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={publishableKey}
        signInFallbackRedirectUrl="/dashboard"
        signInUrl="/login"
        appearance={clerkAppearance}
        localization={clerkLocalization}
      >
        <QueryClientProvider client={queryClient}>
          <ToastContextProvider>
            <ProgressProvider color="#eef5ff" height="3px" delay={250} spinnerPosition="top-right">
              <ProgressManager />
              <BackgroundQueryProgress />
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
