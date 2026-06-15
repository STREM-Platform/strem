/**
 * Feature flags for capabilities that need backend/contract work before they can
 * be fully real (see docs/premium-gamified-frontend-gap-analysis.md). The UI is
 * built against these so the premium experience can ship while being honest
 * about what the server actually supports.
 */

export const FLAGS = {
  /**
   * Structured, set-by-set guided workout execution. The contract has no
   * server-side workout tracking yet, so this runs locally as a *preview* and
   * persists only the final session via `POST /training/sessions`.
   */
  guidedWorkoutsPreview: true,

  /**
   * Photo / text / voice → structured workout import. Needs
   * `POST /workouts/import-image` (and a text parser) first. Until then the
   * import methods are shown but report an honest unsupported state — no
   * extracted workout data is fabricated.
   */
  workoutImport: false,
} as const;
