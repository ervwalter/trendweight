import { useEffect, useState } from "react";
import type { FC, ReactNode } from "react";
import { supabase } from "../supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";
import { authSuspenseManager } from "./authSuspense";
import { AuthContext, type AuthContextType, type User } from "./authContext";
import { router } from "../../router";

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Transform Supabase user to our User type
  const transformUser = (supabaseUser: SupabaseUser | null): User | null => {
    if (!supabaseUser) return null;

    return {
      uid: supabaseUser.id,
      email: supabaseUser.email || null,
      displayName: supabaseUser.user_metadata?.name || null,
    };
  };

  // OTP authentication methods
  const sendOtpCode = async (email: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        captchaToken,
      },
    });

    if (error) {
      throw error;
    }
  };

  const verifyOtpCode = async (email: string, token: string): Promise<Session | null> => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      throw error;
    }

    return data.session;
  };

  // Social sign-in methods
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/verify`,
      },
    });

    if (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const signInWithMicrosoft = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        redirectTo: `${window.location.origin}/auth/verify`,
        scopes: "email",
      },
    });

    if (error) {
      console.error("Error signing in with Microsoft:", error);
      throw error;
    }
  };

  const signInWithApple = async () => {
    // Check if Apple JS is available
    if (!window.AppleID) {
      throw new Error("Apple Sign In is not available. Please check configuration.");
    }

    try {
      // Trigger Apple sign in - this will redirect to Apple
      // The calling component is responsible for setting apple_auth_redirect if needed
      await window.AppleID.auth.signIn();

      // Note: Code execution won't reach here as the page will redirect
    } catch (error) {
      console.error("Apple sign-in failed:", error);
      // Clean up session storage on error
      sessionStorage.removeItem("apple_auth_state");
      sessionStorage.removeItem("apple_auth_redirect");
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Error signing out:", error);

        // If the error is about missing session or network issues, force clear everything locally
        if (error.message === "Auth session missing!" || error.message.includes("network") || error.message.includes("fetch")) {
          // Clear all Supabase localStorage items to force a clean state
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));

          // Clear local state and navigate
          setUser(null);
          setSession(null);
          router.navigate({ to: "/" });

          // Reload the page to ensure clean state
          window.location.reload();
          return;
        }

        throw error;
      }
    } catch (error) {
      console.error("Error during sign out:", error);

      // Even if signOut fails due to network, clear local state
      if (error instanceof Error && (error.message.includes("network") || error.message.includes("fetch"))) {
        // Clear local auth state even if server request failed
        setUser(null);
        setSession(null);
        router.navigate({ to: "/" });
        return;
      }

      throw error;
    }
  };

  // Apple token sign-in
  const signInWithAppleToken = async (idToken: string) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: idToken,
    });

    if (error) {
      throw error;
    }
  };

  // Handle auth state changes
  useEffect(() => {
    // Get initial session from local storage
    const initializeAuth = async () => {
      try {
        // Get the cached session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // Trust the cached session - Supabase will handle refresh if needed
          setSession(session);
          setUser(transformUser(session.user));
        } else {
          // No session
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        setSession(null);
        setUser(null);
      } finally {
        setIsInitializing(false);
        authSuspenseManager.setInitializing(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event, "Session valid:", !!session);

      // Log session expiration info for debugging
      if (session) {
        const expiresAt = new Date(session.expires_at! * 1000);
        const now = new Date();
        const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        console.log(`Session expires at: ${expiresAt.toLocaleString()}, Hours until expiry: ${hoursUntilExpiry.toFixed(2)}`);
      }

      setSession(session);
      setUser(transformUser(session?.user || null));

      // Handle sign out by redirecting to home
      if (event === "SIGNED_OUT") {
        router.navigate({ to: "/" });
      }

      // Log token refresh events
      if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed successfully");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Add periodic session refresh check
  useEffect(() => {
    if (!session) return;

    // Check every 5 minutes if we need to refresh the token
    const interval = setInterval(
      async () => {
        try {
          const {
            data: { session: currentSession },
            error,
          } = await supabase.auth.getSession();

          if (currentSession && !error) {
            const expiresAt = currentSession.expires_at! * 1000;
            const now = Date.now();
            const minutesUntilExpiry = (expiresAt - now) / (1000 * 60);

            // Refresh if less than 10 minutes until expiry
            if (minutesUntilExpiry < 10) {
              console.log(`Token expiring in ${minutesUntilExpiry.toFixed(1)} minutes, refreshing...`);
              const { data, error: refreshError } = await supabase.auth.refreshSession();

              if (refreshError) {
                console.error("Failed to refresh session:", refreshError);
              } else if (data.session) {
                console.log("Session refreshed successfully");
              }
            }
          }
        } catch (error) {
          console.error("Error checking session expiry:", error);
        }
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [session]);

  const value: AuthContextType = {
    user,
    session,
    isInitializing,
    isLoggedIn: !!user,
    sendOtpCode,
    verifyOtpCode,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithApple,
    signInWithAppleToken,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
