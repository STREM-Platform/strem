/**
 * Session state for the app: who is signed in, and whether they have finished
 * onboarding. Drives the route guard in the root layout.
 *
 * On mount it restores a session from securely-stored tokens (validating them
 * against `/auth/me`) and reads onboarding and legal status. Only a refused
 * session (`SessionExpiredError`, 401/403) clears the tokens; a network failure,
 * timeout or server error during restore keeps them and moves to `unavailable`,
 * which shows a retry screen without granting app access (#2). Sign-in/up persist
 * the token pair; sign-out revokes the refresh token and clears storage.
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
import { checkStoredSession, type Restored } from "@/lib/session/restore";
import { clearTokens, getStoredTokens, storeTokens } from "@/lib/session/tokens";

type Phase = "loading" | "unavailable" | "signedOut" | "signedIn";

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
  /** Try restoring the stored session again (from the `unavailable` screen). */
  retrySession: () => Promise<void>;
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

  const applyRestored = useCallback((restored: Restored): void => {
    setUser(restored.phase === "signedIn" ? restored.user : null);
    setOnboardingCompleted(restored.phase === "signedIn" ? restored.onboardingCompleted : null);
    setLegalAccepted(restored.phase === "signedIn" ? restored.legalAccepted : null);
    setPhase(restored.phase);
  }, []);

  // Restore a session on first mount.
  useEffect(() => {
    let active = true;
    (async () => {
      const restored = await checkStoredSession();
      if (active) applyRestored(restored);
    })();
    return () => {
      active = false;
    };
  }, [applyRestored]);

  const retrySession = useCallback(async (): Promise<void> => {
    setPhase("loading");
    applyRestored(await checkStoredSession());
  }, [applyRestored]);

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
      retrySession,
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
      retrySession,
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
