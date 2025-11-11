import { useClerk, useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import type { GetToken } from "@clerk/shared/types";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types/user";

// Re-export GetToken so other files don't need to import from Clerk directly
export type { GetToken };

export interface AuthState {
  user: User | null;
  isLoaded: boolean;
  isLoggedIn: boolean;
  signOut: (redirectUrl?: string) => Promise<void>;
  getToken: GetToken;
}

export function useAuth(): AuthState {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
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
    await clerkSignOut({ redirectUrl: redirectUrl || "/" });
    // Clear all React Query caches on sign out
    queryClient.clear();
  };

  return {
    user,
    isLoaded,
    isLoggedIn: isSignedIn ?? false,
    signOut,
    getToken,
  };
}
