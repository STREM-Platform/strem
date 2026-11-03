/**
 * Session state for the app: who is signed in, and whether they have finished
 * onboarding. Drives the route guard in the root layout.
 *
 * On mount it restores a session from securely-stored tokens (validating them
 * against `/auth/me`) and reads onboarding status. Sign-in/up persist the token
 * pair; sign-out revokes the refresh token and clears storage. Any
 * `SessionExpiredError` bubbling up from the client signs the user out.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { api, SessionExpiredError } from "@/lib/api/client";
import type { AuthIdentity } from "@/lib/api/types";
import { clearTokens, getStoredTokens, storeTokens } from "@/lib/session/tokens";

type Phase = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  phase: Phase;
  user: AuthIdentity | null;
  /** null while unknown (still loading status), else whether onboarding is complete. */
  onboardingCompleted: boolean | null;
  /** null while unknown, else whether all required legal docs are accepted. */
  legalAccepted: boolean | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;
  refreshLegalStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [user, setUser] = useState<AuthIdentity | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [legalAccepted, setLegalAccepted] = useState<boolean | null>(null);

  const loadOnboarding = useCallback(async (): Promise<void> => {
    const status = await api.getOnboardingStatus();
    setOnboardingCompleted(status.completed);
  }, []);

  const loadLegal = useCallback(async (): Promise<void> => {
    const status = await api.getLegalStatus();
    setLegalAccepted(!status.needs_acceptance);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    const tokens = await getStoredTokens();
    if (tokens) {
      try {
        await api.logout(tokens.refreshToken);
      } catch {
        // Best-effort revoke; clear local state regardless.
      }
    }
    await clearTokens();
    setUser(null);
    setOnboardingCompleted(null);
    setLegalAccepted(null);
    setPhase("signedOut");
  }, []);

  // Restore a session on first mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const tokens = await getStoredTokens();
      if (!tokens) {
        if (active) setPhase("signedOut");
        return;
      }
      try {
        const identity = await api.getMe();
        await Promise.all([loadOnboarding(), loadLegal()]);
        if (active) {
          setUser(identity);
          setPhase("signedIn");
        }
      } catch {
        await clearTokens();
        if (active) setPhase("signedOut");
      }
    })();
    return () => {
      active = false;
    };
  }, [loadOnboarding, loadLegal]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      const session = await api.login({ email, password });
      await storeTokens(session.tokens);
      setUser(session.user);
      await Promise.all([loadOnboarding(), loadLegal()]);
      setPhase("signedIn");
    },
    [loadOnboarding, loadLegal],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string): Promise<void> => {
      const session = await api.register({ email, password, display_name: displayName });
      await storeTokens(session.tokens);
      setUser(session.user);
      setOnboardingCompleted(false); // a fresh account has not onboarded
      setLegalAccepted(false); // ...nor accepted the policies yet
      setPhase("signedIn");
    },
    [],
  );

  const refreshOnboardingStatus = useCallback(async (): Promise<void> => {
    try {
      await loadOnboarding();
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        await signOut();
      } else {
        throw error;
      }
    }
  }, [loadOnboarding, signOut]);

  const refreshLegalStatus = useCallback(async (): Promise<void> => {
    try {
      await loadLegal();
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        await signOut();
      } else {
        throw error;
      }
    }
  }, [loadLegal, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      phase,
      user,
      onboardingCompleted,
      legalAccepted,
      signIn,
      signUp,
      signOut,
      refreshOnboardingStatus,
      refreshLegalStatus,
    }),
    [
      phase,
      user,
      onboardingCompleted,
      legalAccepted,
      signIn,
      signUp,
      signOut,
      refreshOnboardingStatus,
      refreshLegalStatus,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
