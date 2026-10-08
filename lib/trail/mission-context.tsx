import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { raceMissions, type RaceMission } from "@/lib/api/race-missions";
import { ApiError, SessionExpiredError } from "@/lib/api/client";
import { useAuth } from "@/lib/session/auth-context";

interface MissionState { mission: RaceMission | null; loading: boolean; error: string | null; reload: () => Promise<void> }
const Context = createContext<MissionState | null>(null);
/** Mounted with an account key by the authenticated app layout. Never persists a second local truth. */
export function MissionProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [mission, setMission] = useState<RaceMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const next = await raceMissions.active();
      if (current === generation.current) setMission(next);
    } catch (err) {
      if (current === generation.current) {
        setMission(null);
        setError(err instanceof SessionExpiredError ? "Your session expired. Sign in again." : err instanceof ApiError && err.status === 404 ? "The Race Mission API is not available on this server yet." : "We could not load your saved mission. Check your connection and retry.");
        if (err instanceof SessionExpiredError) await signOut();
      }
    } finally { if (current === generation.current) setLoading(false); }
  }, [signOut]);
  useEffect(() => {
    // Loading is already true on mount. Defer the shared reload entrypoint;
    // generation cancellation also suppresses late responses after account switches.
    const timer = setTimeout(() => void reload(), 0);
    return () => {
      clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- a request counter, not a DOM ref
      generation.current++;
    };
  }, [reload]);
  return <Context.Provider value={{ mission, loading, error, reload }}>{children}</Context.Provider>;
}
export function useMission() { const state = useContext(Context); if (!state) throw new Error("MissionProvider missing"); return state; }
