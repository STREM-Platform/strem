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

  /**
   * Meal-level macros + hydration on Fuel. The nutrition contract is day-level
   * only (`targets_met` + notes), so the macro rings / hydration / photo→food
   * logging render as a clearly-labelled *preview* on sample data and persist
   * nothing. The real, persisted action stays the day-level check-in.
   */
  nutritionMacrosPreview: true,

  /**
   * Forge — the omniscient AI agent. The context graph (A1), signals (A4),
   * memory (A5), coach chat (B1), proactive nudges/run-loop (B3), adaptive
   * missions + plan import (B4), insights (B8), live-workout autoregulation
   * (D1/D2) and photo/voice capture (D3/D4/D6) run against `lib/services/agent.mock`
   * until the real endpoints land. Every Forge surface is honestly grounded in
   * this one mocked graph and cites it; nothing is persisted server-side yet.
   */
  forgeAgentMock: true,
} as const;
