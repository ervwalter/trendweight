import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "../../types/user";

interface AuthState {
  user: User | null;
  isInitializing: boolean;
  isLoggedIn: boolean;
  signOut: (redirectUrl?: string) => Promise<void>;
  getToken: () => Promise<string | null>;
}

export function useAuth(): AuthState {
  const { user: clerkUser, isLoaded } = useUser();
  const { isSignedIn, getToken } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();
  const queryClient = useQueryClient();

  // Map Clerk user to our User type
  const user: User | null =
    clerkUser && isSignedIn
      ? {
          uid: clerkUser.id, // This will be replaced with internal GUID from API
          email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
          displayName: clerkUser.fullName ?? clerkUser.primaryEmailAddress?.emailAddress ?? "",
        }
      : null;

  const signOut = async (redirectUrl?: string) => {
    console.log("[useAuth] signOut called with redirectUrl:", redirectUrl || "/");
    await clerkSignOut({ redirectUrl: redirectUrl || "/" });
    // Clear all React Query caches on sign out
    queryClient.clear();
    console.log("[useAuth] signOut completed, caches cleared");
  };

  return {
    user,
    isInitializing: !isLoaded,
    isLoggedIn: isSignedIn ?? false,
    signOut,
    getToken,
  };
}
