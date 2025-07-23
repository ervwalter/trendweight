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

  // Send login email
  const sendLoginEmail = async (email: string, captchaToken?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/verify`,
        captchaToken,
      },
    });

    if (error) {
      console.error("Error sending login email:", error);
      throw error;
    }

    // Store email for later verification
    window.localStorage.setItem("emailForSignIn", email);
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

        // If the error is about missing session, force clear everything
        if (error.message === "Auth session missing!") {
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
      throw error;
    }
  };

  // Handle auth state changes
  useEffect(() => {
    // Get initial session and validate it with the server
    const initializeAuth = async () => {
      try {
        // First get the cached session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // If we have a session, validate it by calling getUser
          // This will check with the server if the user still exists
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser();

          if (error || !user) {
            // Token is invalid or user was deleted
            console.warn("Session validation failed:", error?.message);
            // Clear the invalid session
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            // Session is valid
            setSession(session);
            setUser(transformUser(user));
          }
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
      setSession(session);
      setUser(transformUser(session?.user || null));

      // Handle sign out by redirecting to home
      if (event === "SIGNED_OUT") {
        router.navigate({ to: "/" });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    session,
    isInitializing,
    isLoggedIn: !!user,
    sendLoginEmail,
    signInWithGoogle,
    signInWithMicrosoft,
    signInWithApple,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
