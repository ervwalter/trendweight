import { RouterProvider } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ProgressProvider } from "@bprogress/react";
import { AuthProvider } from "./lib/auth/AuthProvider";
import { router } from "./router";
import { queryClient } from "./lib/queryClient";
import { BackgroundQueryProgress } from "./lib/progress/BackgroundQueryProgress";
import { ProgressManager } from "./lib/progress/ProgressManager";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContextProvider } from "./components/ui/ToastProvider";
import { setupVersionSkewHandler } from "./lib/version-skew/setupVersionSkewHandler";
import "@bprogress/core/css";
import "./lib/progress/progress.css";

// Set up version skew handling
setupVersionSkewHandler();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastContextProvider>
          <ProgressProvider color="#eef5ff" height="3px" delay={250} spinnerPosition="top-right">
            <ProgressManager />
            <AuthProvider>
              <BackgroundQueryProgress />
              <RouterProvider router={router} />
            </AuthProvider>
          </ProgressProvider>
          <ReactQueryDevtools initialIsOpen={false} />
        </ToastContextProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
