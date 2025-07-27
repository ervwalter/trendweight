import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import type { User } from "../../types/user";

interface AuthState {
  user: User | null;
  isInitializing: boolean;
  isLoggedIn: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState {
  const { user: clerkUser, isLoaded } = useUser();
  const { isSignedIn } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();

  // Map Clerk user to our User type
  const user: User | null =
    clerkUser && isSignedIn
      ? {
          uid: clerkUser.id, // This will be replaced with internal GUID from API
          email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
          displayName: clerkUser.fullName ?? clerkUser.primaryEmailAddress?.emailAddress ?? "",
        }
      : null;

  const signOut = async () => {
    await clerkSignOut();
  };

  return {
    user,
    isInitializing: !isLoaded,
    isLoggedIn: isSignedIn ?? false,
    signOut,
  };
}
