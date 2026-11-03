/**
 * Builds mission layers with visible per-layer progress: the plan first (others
 * may reference it), then fuel, gear, logistics and strategy in parallel.
 * Results report who built each layer, and why the AI wasn't used if not.
 */

import { useCallback, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { raceAi, type LayerBuildResult } from "@/lib/api/race";

export const BUILD_ORDER = ["plan", "fuel", "gear", "logistics", "strategy"] as const;
export type BuildKind = (typeof BUILD_ORDER)[number];
export type BuildState = { status: "waiting" | "building" | "done" | "error"; origin?: string; reason?: string | null; message?: string };

export function useBuilder(onDone: () => Promise<void> | void) {
  const [states, setStates] = useState<Partial<Record<BuildKind, BuildState>>>({});
  const [running, setRunning] = useState(false);

  const build = useCallback(
    async (missionId: string, kinds: BuildKind[] = [...BUILD_ORDER], useAi = true) => {
      setRunning(true);
      setStates(Object.fromEntries(kinds.map((k) => [k, { status: "waiting" }])));
      const one = async (kind: BuildKind) => {
        setStates((s) => ({ ...s, [kind]: { status: "building" } }));
        try {
          const result: LayerBuildResult = await raceAi.buildLayer(missionId, kind, useAi);
          if (result.error) throw new Error(result.message ?? result.error);
          setStates((s) => ({ ...s, [kind]: { status: "done", origin: result.origin, reason: result.ai_reason } }));
        } catch (err) {
          const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Build failed";
          setStates((s) => ({ ...s, [kind]: { status: "error", message } }));
        }
      };
      try {
        if (kinds.includes("plan")) await one("plan");
        await Promise.all(kinds.filter((k) => k !== "plan").map(one));
        await onDone();
      } finally {
        setRunning(false);
      }
    },
    [onDone],
  );

  return { states, running, build, reset: () => setStates({}) };
}
