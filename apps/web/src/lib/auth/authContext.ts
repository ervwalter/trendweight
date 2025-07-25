import { createContext } from "react";
import type { Session } from "@supabase/supabase-js";

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  isInitializing: boolean;
  isLoggedIn: boolean;
  sendOtpCode: (email: string, captchaToken?: string) => Promise<void>;
  verifyOtpCode: (email: string, token: string) => Promise<Session | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithAppleToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
