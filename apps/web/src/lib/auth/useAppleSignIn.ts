import { useEffect } from "react";

export function useAppleSignIn() {
  useEffect(() => {
    const appleServicesId = import.meta.env.VITE_APPLE_SERVICES_ID;
    if (!appleServicesId) {
      return;
    }

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="appleid.auth.js"]');
    if (existingScript) {
      // If AppleID is already initialized, we're done
      if (window.AppleID) {
        return;
      }
    }

    const script = document.createElement("script");
    script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // Initialize Apple ID auth after script loads
      if (window.AppleID) {
        // Generate a state value for this session
        const state = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem("apple_auth_state", state);

        window.AppleID.auth.init({
          clientId: appleServicesId,
          scope: "name email",
          redirectURI: `${window.location.origin}/api/auth/apple/callback`, // Backend endpoint
          state: state,
          usePopup: false, // Use redirect mode
        });
      }
    };

    document.head.appendChild(script);
  }, []);
}
