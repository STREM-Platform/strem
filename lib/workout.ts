/**
 * Structured workout shapes for the guided-execution preview, mirroring
 * `design-spec/strem-data.jsx` (`DATA.workout`). This is a *sample* template used
 * to demo the structured-training experience until the backend supports
 * server-side workout tracking (gap analysis). Only the final session is
 * persisted, via `POST /training/sessions`.
 */

import type { SessionType } from "@/lib/api/types";

export interface SetTarget {
  reps: number;
  /** Load in kg; absent for bodyweight movements. */
  kg?: number;
}

export interface Exercise {
  name: string;
  note?: string;
  sets: SetTarget[];
  /** Rest after each set, in seconds. */
  rest: number;
}

export interface Workout {
  title: string;
  type: SessionType;
  /** Where the workout came from, e.g. "Sample guided session". */
  source: string;
  /** Estimated duration in minutes. */
  est: number;
  exercises: Exercise[];
}

export interface WorkoutResult {
  workout: Workout;
  /** Elapsed seconds. */
  elapsed: number;
  /** Total volume lifted (kg). */
  volume: number;
  /** Sets completed. */
  sets: number;
}

export function totalSets(w: Workout): number {
  return w.exercises.reduce((n, e) => n + e.sets.length, 0);
}

export function totalVolume(w: Workout): number {
  return w.exercises.reduce(
    (v, e) => v + e.sets.reduce((s, st) => s + (st.kg ?? 0) * st.reps, 0),
    0,
  );
}

/** mm:ss */
export function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const SAMPLE_WORKOUT: Workout = {
  title: "Lower Power — Block B",
  type: "strength",
  source: "Sample guided session",
  est: 52,
  exercises: [
    {
      name: "Trap-Bar Deadlift",
      note: "Explosive up, controlled down",
      sets: [
        { reps: 5, kg: 100 },
        { reps: 5, kg: 100 },
        { reps: 5, kg: 105 },
        { reps: 3, kg: 110 },
      ],
      rest: 150,
    },
    {
      name: "Bulgarian Split Squat",
      note: "Each leg",
      sets: [
        { reps: 8, kg: 24 },
        { reps: 8, kg: 24 },
        { reps: 8, kg: 24 },
      ],
      rest: 90,
    },
    {
      name: "Nordic Hamstring Curl",
      note: "Slow eccentric",
      sets: [{ reps: 6 }, { reps: 6 }, { reps: 5 }],
      rest: 90,
    },
    {
      name: "Standing Calf Raise",
      note: "Full stretch",
      sets: [
        { reps: 15, kg: 40 },
        { reps: 15, kg: 40 },
        { reps: 15, kg: 40 },
      ],
      rest: 60,
    },
  ],
};
