/**
 * Sets up version skew handling for the application.
 * This is called once at app initialization, outside of React components.
 */
export function setupVersionSkewHandler() {
  let isReloading = false;

  console.log("[Version Skew Handler] Setting up handlers");

  // Listen for Vite preload errors (chunk loading failures)
  window.addEventListener("vite:preloadError", (event: Event) => {
    console.log("[Version Skew Handler] vite:preloadError event:", event);

    if (!isReloading) {
      isReloading = true;
      console.warn("[Version Skew Handler] Vite preload error detected - reloading application");

      // Small delay to ensure the error is logged
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  });

  // Handle unhandled promise rejections from dynamic imports
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    const error = event.reason;
    console.log("[Version Skew Handler] Unhandled rejection:", error);

    // Check if this is a chunk loading error
    if (
      !isReloading &&
      error instanceof Error &&
      (error.message?.includes("Failed to fetch dynamically imported module") ||
        error.message?.includes("dynamically imported module") ||
        error.message?.includes("Failed to import"))
    ) {
      isReloading = true;
      console.warn("[Version Skew Handler] Version skew detected - reloading application", error);

      // Force a full page reload
      setTimeout(() => {
        window.location.reload();
      }, 100);

      // Prevent the default error handling
      event.preventDefault();
    }
  });

  // Override window.onerror to catch synchronous errors
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    console.log("[Version Skew Handler] Window error:", { message, source, error });

    if (
      !isReloading &&
      typeof message === "string" &&
      (message.includes("Failed to fetch dynamically imported module") ||
        message.includes("dynamically imported module") ||
        message.includes("Failed to import"))
    ) {
      isReloading = true;
      console.warn("[Version Skew Handler] Window error detected as version skew - reloading");

      setTimeout(() => {
        window.location.reload();
      }, 100);

      return true; // Prevent default error handling
    }

    // Call original handler if exists
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };
}
