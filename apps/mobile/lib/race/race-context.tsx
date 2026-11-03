/**
 * Race state shared by every tab: the athlete's active missions, the focus
 * mission, and that mission's data (plan, progress, layers, daily brief).
 *
 * Server-owned truth only: nothing here is cached as a second source of truth
 * beyond the focus preference. Parts load independently so a slow or failing
 * AI brief never blocks the plan or the tracker.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ApiError, SessionExpiredError } from "@/lib/api/client";
import { courses, type MissionCourse } from "@/lib/api/courses";
import { raceMissions, type RaceMission } from "@/lib/api/race-missions";
import {
  athletePlanApi,
  layersApi,
  planApi,
  raceAi,
  type AthletePlan,
  type AthleteProgress,
  type Brief,
  type LayerKind,
  type MissionLayer,
  type MissionPlan,
  type MissionProgress,
} from "@/lib/api/race";
import { useAuth } from "@/lib/session/auth-context";
import { getPref, setPref } from "@/lib/storage";
import { syncConnectedSources } from "@/lib/sync-sources";

const FOCUS_KEY = "strem.focusMission";
export type DataPart = "plan" | "progress" | "layers" | "brief" | "course";

interface RaceState {
  missions: RaceMission[];
  mission: RaceMission | null;
  loading: boolean;
  error: string | null;
  setFocus: (id: string) => void;
  reloadMissions: (focusId?: string) => Promise<void>;
  plan: MissionPlan | null;
  progress: MissionProgress | null;
  layers: Partial<Record<LayerKind, MissionLayer>>;
  brief: Brief | null;
  /** undefined while unknown; null when no course file is attached. */
  course: MissionCourse | null | undefined;
  dataLoading: boolean;
  dataError: string | null;
  briefLoading: boolean;
  briefError: string | null;
  refresh: (parts?: DataPart[], options?: { briefRefresh?: boolean }) => Promise<void>;
  replacePlan: (plan: MissionPlan) => void;
  /** The athlete's plan across races (and without one); undefined until first loaded. */
  timeline: AthletePlan | null | undefined;
  timelineProgress: AthleteProgress | null;
  timelineError: string | null;
  refreshTimeline: () => Promise<void>;
  replaceTimeline: (plan: AthletePlan) => void;
  replaceLayer: (layer: MissionLayer) => void;
  replaceMission: (mission: RaceMission) => void;
  replaceCourse: (course: MissionCourse | null) => void;
}

const Context = createContext<RaceState | null>(null);

function describe(error: unknown, fallback: string): string {
  if (error instanceof SessionExpiredError) return "Your session expired. Sign in again.";
  if (error instanceof ApiError) {
    if (error.status === 503 || error.status === 502) return "A STREM service is unavailable right now. Retry in a moment.";
    return error.message || fallback;
  }
  return fallback;
}

export function RaceProvider({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const [missions, setMissions] = useState<RaceMission[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<MissionPlan | null>(null);
  const [progress, setProgress] = useState<MissionProgress | null>(null);
  const [layers, setLayers] = useState<Partial<Record<LayerKind, MissionLayer>>>({});
  const [brief, setBrief] = useState<Brief | null>(null);
  const [course, setCourse] = useState<MissionCourse | null | undefined>(undefined);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const generation = useRef(0);
  const [timeline, setTimeline] = useState<AthletePlan | null | undefined>(undefined);
  const [timelineProgress, setTimelineProgress] = useState<AthleteProgress | null>(null);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const handleExpiry = useCallback(
    async (err: unknown) => {
      if (err instanceof SessionExpiredError) await signOut();
    },
    [signOut],
  );

  const reloadMissions = useCallback(
    async (preferId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const [list, stored, backendFocus] = await Promise.all([
          raceMissions.list("active"),
          getPref(FOCUS_KEY),
          raceMissions.active(),
        ]);
        setMissions(list);
        const wanted = preferId ?? stored;
        const next = list.find((m) => m.id === wanted) ?? backendFocus ?? list[0] ?? null;
        setFocusId(next?.id ?? null);
      } catch (err) {
        setError(err instanceof ApiError && err.status === 404 ? "The Race Mission API is not available on this server yet." : describe(err, "We could not load your races. Check your connection and retry."));
        await handleExpiry(err);
      } finally {
        setLoading(false);
      }
    },
    [handleExpiry],
  );

  useEffect(() => {
    const timer = setTimeout(() => void reloadMissions(), 0);
    return () => clearTimeout(timer);
  }, [reloadMissions]);

  // Pull new activities from connected sources once per app session; when any
  // arrive, the tracker and brief reload so today's picture is current.
  const refreshRef = useRef<((parts?: DataPart[], options?: { briefRefresh?: boolean }) => Promise<void>) | null>(null);
  useEffect(() => {
    void syncConnectedSources().then((count) => {
      if (count > 0) void refreshRef.current?.(["progress", "brief"], { briefRefresh: true });
    });
  }, []);

  const mission = useMemo(() => missions.find((m) => m.id === focusId) ?? null, [missions, focusId]);

  const refreshTimeline = useCallback(async () => {
    setTimelineError(null);
    try {
      const [next, nextProgress] = await Promise.all([athletePlanApi.get(), athletePlanApi.progress()]);
      setTimeline(next);
      setTimelineProgress(nextProgress);
    } catch (err) {
      setTimelineError(describe(err, "Your plan could not load. Retry."));
      setTimeline((current) => current ?? null);
      await handleExpiry(err);
    }
  }, [handleExpiry]);

  // The athlete's plan follows every race: reload when the set of races changes.
  const raceKey = missions.map((m) => `${m.id}:${m.event.race_date}:${m.goal.priority}`).join("|");
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => void refreshTimeline(), 0);
    return () => clearTimeout(timer);
  }, [loading, raceKey, refreshTimeline]);

  const refresh = useCallback(
    async (parts: DataPart[] = ["plan", "progress", "layers", "brief", "course"], options: { briefRefresh?: boolean } = {}) => {
      if (!mission) {
        // No race: the athlete's own plan still loads.
        if (parts.includes("plan") || parts.includes("progress")) await refreshTimeline();
        return;
      }
      const current = generation.current;
      const id = mission.id;
      const core = parts.filter((p) => p !== "brief" && p !== "course");
      const tasks: Promise<void>[] = [];
      if (core.length) {
        setDataLoading(true);
        setDataError(null);
        tasks.push(
          (async () => {
            try {
              const [nextPlan, nextProgress, nextLayers] = await Promise.all([
                core.includes("plan") ? planApi.get(id) : Promise.resolve(undefined),
                core.includes("progress") ? planApi.progress(id) : Promise.resolve(undefined),
                core.includes("layers") ? layersApi.list(id) : Promise.resolve(undefined),
              ]);
              if (current !== generation.current) return;
              if (nextPlan !== undefined) setPlan(nextPlan);
              if (nextProgress !== undefined) setProgress(nextProgress);
              if (nextLayers !== undefined) setLayers(Object.fromEntries(nextLayers.map((l) => [l.kind, l])));
            } catch (err) {
              if (current === generation.current) setDataError(describe(err, "Some race data could not load. Retry."));
              await handleExpiry(err);
            } finally {
              if (current === generation.current) setDataLoading(false);
            }
          })(),
        );
      }
      if (parts.includes("course")) {
        tasks.push(
          courses
            .get(id)
            .then((value) => {
              if (current === generation.current) setCourse(value);
            })
            .catch(() => {
              // Course storage can be disabled on a server; treat as unknown.
              if (current === generation.current) setCourse(undefined);
            }),
        );
      }
      if (parts.includes("brief")) {
        setBriefLoading(true);
        setBriefError(null);
        tasks.push(
          (async () => {
            try {
              const next = await raceAi.brief(id, options.briefRefresh);
              if (current === generation.current) setBrief(next);
            } catch (err) {
              if (current === generation.current) setBriefError(describe(err, "The race brief is unavailable right now."));
            } finally {
              if (current === generation.current) setBriefLoading(false);
            }
          })(),
        );
      }
      if (parts.includes("plan") || parts.includes("progress")) tasks.push(refreshTimeline());
      await Promise.all(tasks);
    },
    [mission, handleExpiry, refreshTimeline],
  );

  // A different focus mission starts from empty data (reset during render, not
  // in an effect), then the effect below loads it.
  const [dataFor, setDataFor] = useState<string | null>(null);
  if ((mission?.id ?? null) !== dataFor) {
    setDataFor(mission?.id ?? null);
    setPlan(null);
    setProgress(null);
    setLayers({});
    setBrief(null);
    setCourse(undefined);
  }

  useEffect(() => {
    generation.current += 1;
    if (!mission) return;
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
    // Reload only when the focused mission (not its version) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission?.id]);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  const setFocus = useCallback((id: string) => {
    setFocusId(id);
    void setPref(FOCUS_KEY, id);
  }, []);

  const value: RaceState = {
    missions,
    mission,
    loading,
    error,
    setFocus,
    reloadMissions,
    plan,
    progress,
    layers,
    brief,
    course,
    dataLoading,
    dataError,
    briefLoading,
    briefError,
    refresh,
    replacePlan: setPlan,
    timeline,
    timelineProgress,
    timelineError,
    refreshTimeline,
    replaceTimeline: setTimeline,
    replaceLayer: (layer) => setLayers((current) => ({ ...current, [layer.kind]: layer })),
    replaceMission: (next) => setMissions((current) => current.map((m) => (m.id === next.id ? next : m))),
    replaceCourse: setCourse,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRace(): RaceState {
  const state = useContext(Context);
  if (!state) throw new Error("RaceProvider missing");
  return state;
}
