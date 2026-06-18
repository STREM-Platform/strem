/**
 * Forge agent — mocked service (flag-gated).
 *
 * Returns the EXACT shapes from the prototype data contract
 * (`prototype/lib/strem-ai-data.jsx` + `strem-ai-data2.jsx`). Every surface reads
 * one of these so the "everything feeds one context graph" thesis holds in the
 * UI before the backend exists.
 *
 * Each block is wired to a backend issue (roadmap epic). When the real endpoint
 * lands, swap the corresponding `forge.*` call in `lib/agent/index.ts` — the UI
 * shapes do not change.
 *
 *   TODO(BE-A6):       context assembler                          — see issue #43
 *   TODO(BE-A4):       signals engine                             — see issue #44
 *   TODO(BE-A1/A5):    context graph store + memory               — see issue #45
 *   TODO(BE-A3):       connected-source ingestion                 — see issue #46
 *   TODO(BE-A8):       guardrail filter                           — see issue #47
 *   TODO(BE-B1):       agent / LLM endpoint (chat, plan, debrief) — see issue #48
 *   TODO(BE-B3):       proactive trigger engine (nudge, run-loop) — see issue #49
 *   TODO(BE-B4):       adaptive missions + plan import            — see issue #50
 *   TODO(BE-B8):       cross-domain insights                      — see issue #51
 *   TODO(BE-D1/D2):    live-workout autoregulation + PR detect    — see issue #52
 *   TODO(BE-D3/D4/D6): photo/voice capture                        — see issue #53
 *   TODO(BE-A7):       consent / source toggles / export-delete   — see issue #54
 */

import type {
  AdaptivePlan,
  AthleteContext,
  Atlas,
  CaptureData,
  Checkin,
  CoachConversation,
  Insight,
  League,
  LiveWorkout,
  Nudge,
  PlanImport,
  PrivacyData,
  ProofData,
  Season,
  Chapter,
  TodayBrief,
} from "@/lib/agent/types";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Context the coach can see — proves omniscience (A1 + A3 + A4 + A5) ────────
const CONTEXT: AthleteContext = {
  sources: [
    { id: "whoop", label: "Whoop", icon: "heart", on: true, last: "23m ago", metric: "Sleep · HRV · Recovery" },
    { id: "strava", label: "Strava", icon: "route", on: true, last: "1h ago", metric: "Runs · Pace · Routes" },
    { id: "health", label: "Apple Health", icon: "plus", on: true, last: "Live", metric: "Steps · Workouts" },
    { id: "logs", label: "In-app logs", icon: "edit", on: true, last: "Live", metric: "Sets · Meals · RPE" },
  ],
  signals: {
    readiness: 62,
    readinessLabel: "Moderate",
    sleepHours: "5h24m",
    sleepDelta: "−1.6h vs avg",
    hrv: 48,
    hrvDelta: "−12%",
    restingHr: 54,
    load7: 412,
    load28: 388,
    acwr: 1.06,
    loadLabel: "Optimal",
    momentum: "Rising",
    streakRisk: false,
  },
  memory: [
    { icon: "heart", text: "Left knee flares on lunges — sub split squats" },
    { icon: "clock", text: "Trains best mornings, before 9am" },
    { icon: "target", text: "Goal: Hybrid athlete by Titan rank" },
    { icon: "flame", text: "Loves trap-bar work, hates burpees" },
  ],
};

const TODAY_BRIEF: TodayBrief = {
  readiness: 62,
  label: "Moderate",
  headline: "Train smart, not heavy.",
  body: "You slept 5h24m and HRV is down 12% — your body's still paying off Tuesday's trap-bar PR. I swapped today's heavy squats for a Zone-2 run + mobility. Keeps the streak alive and protects the gains.",
  action: { type: "running", icon: "route", label: "Zone-2 Run · 35 min", sub: "Swapped from Heavy Squats", xp: 120 },
  why: [
    { icon: "moon", text: "Sleep 5h24m", em: "−1.6h" },
    { icon: "heart", text: "HRV 48ms", em: "−12%" },
    { icon: "flame", text: "Day 2 post-PR", em: "recovering" },
  ],
};

const NUDGE: Nudge = {
  tone: "amber",
  icon: "moon",
  tag: "PROACTIVE · 06:48",
  title: "I caught something overnight.",
  body: "Two nights under 6h and your HRV slid 12%. Before you train, give me 10 seconds — how do you actually feel?",
};

const CHECKIN: Checkin = {
  fields: [
    { id: "energy", label: "Energy", icon: "bolt", opts: ["Flat", "Okay", "Charged"] },
    { id: "sleep", label: "Sleep", icon: "moon", opts: ["Rough", "Broken", "Solid"] },
    { id: "soreness", label: "Legs", icon: "dumbbell", opts: ["Fried", "Tight", "Fresh"] },
  ],
  result: {
    readiness: 62,
    line: "Logged. That matches what Whoop saw — I've tuned today around it. Recovery-first, streak protected.",
  },
};

const COACH: CoachConversation = {
  name: "Forge",
  opener: {
    text: "Morning, Deyan. I already read your night — here's where you stand. Ask me anything; I can see all of it.",
    cites: [
      { icon: "heart", text: "Whoop synced 23m ago" },
      { icon: "moon", text: "Sleep 5h24m" },
    ],
  },
  prompts: [
    {
      q: "What should I train today?",
      a: "Given last night — 5h24m sleep, HRV down 12% — I'd hold off on heavy squats. You hit a trap-bar PR at 110kg on Tuesday, so your CNS is still cashing that check. Do a 35-min Zone-2 run instead: it keeps your 12-day streak, widens the endurance base Hybrid needs, and lets the legs recover. Heavy lower moves to Thursday when you're fresh.",
      cites: [
        { icon: "moon", text: "Sleep 5h24m" },
        { icon: "heart", text: "HRV −12%" },
        { icon: "bolt", text: "Trap-bar PR 110kg" },
        { icon: "flame", text: "Streak 12d" },
      ],
    },
    {
      q: "Why this mission?",
      a: "'Sub-25 5K' is on your board because your goal is Hybrid and running is the gap — 2 runs a week versus the 3 your plan needs. Your last tempo held 4:55/km for 8.2km, so sub-25 is about 4:59/km: a stretch you can actually hit, not a fantasy. Land it and you clear the biggest blocker between Forged and Hybrid.",
      cites: [
        { icon: "target", text: "Goal: Hybrid" },
        { icon: "route", text: "Runs 2/wk" },
        { icon: "timer", text: "Last tempo 4:55/km" },
      ],
    },
    {
      q: "I'm sore today",
      a: "Noted — and it tracks. You trained lower Tuesday, ran Wednesday, and slept under 6h twice this week. That's accumulated fatigue, not weakness. I remember your left knee flares on lunges, so I'm keeping you off split squats. Take it as mobility plus an easy spin — I'll push the next hard session to Friday and protect the streak with a recovery check-in.",
      cites: [
        { icon: "dumbbell", text: "Lower Tue" },
        { icon: "route", text: "Run Wed" },
        { icon: "moon", text: "Sleep <6h ×2" },
        { icon: "heart", text: "Memory: left knee" },
      ],
    },
    {
      q: "Plan my week",
      a: "Built around 5 days, mornings before 9am like you keep best. Mon upper push, Tue Zone-2 run, Wed mobility, Thu lower power — that's where your trap-bar progression lives — Fri the Sub-25 5K attempt. One thing: protein's landing at 132g on heavy days, about 50g short. Bump breakfast and Thursday's lift will feel different. Fuel and sleep I'll keep watching and adjust live.",
      cites: [
        { icon: "clock", text: "Mornings <9am" },
        { icon: "bolt", text: "Protein 132g (−50g)" },
        { icon: "dumbbell", text: "Trap-bar progression" },
      ],
    },
  ],
};

const LIVE_WORKOUT: LiveWorkout = {
  title: "Lower Power · Block B",
  tag: "AUTOREGULATED FOR TODAY",
  note: "Readiness 62 — I trimmed top sets and added rest. Push the first two, then we reassess.",
  exercises: [
    {
      name: "Trap-Bar Deadlift",
      target: "4 × 5",
      rest: 150,
      sets: [
        { reps: 5, kg: 100, ai: "Opener at 90% of Tue. Bar speed is your green light.", done: true, rpe: 7 },
        { reps: 5, kg: 100, ai: "Matched. Same speed — hold here, don't chase the PR today.", done: true, rpe: 8 },
        { reps: 5, kg: 102, ai: "Small bump. If RPE hits 9, we stop the climb.", done: false, rpe: null },
        { reps: 3, kg: 105, ai: "Capped below Tuesday's 110 PR — protecting a tired CNS.", done: false, rpe: null },
      ],
    },
    {
      name: "Bulgarian Split Squat",
      target: "3 × 8",
      rest: 90,
      sets: [{ reps: 8, kg: 22, ai: "Subbed in for lunges — your left knee, remembered. Lighter, controlled.", done: false, rpe: null }],
    },
  ],
  prDetected: { lift: "Trap-Bar Deadlift", val: "102 kg × 5", note: "Best 5-rep load — at 62% readiness." },
};

// A scanned/imported workout, ready to run as a live session (D3 → D1). The same
// photo→sets parse that powers "log with AI" can become a guided live workout.
const SCANNED_WORKOUT: LiveWorkout = {
  title: "Push Day · Imported",
  tag: "SCANNED FROM YOUR PHOTO",
  note: "Parsed from your screenshot and matched to your last Push day. Push the first sets — I autoregulate load and rest from your RPE.",
  exercises: [
    {
      name: "Bench Press",
      target: "4 × 6",
      rest: 150,
      sets: [
        { reps: 6, kg: 80, ai: "+2.5kg vs your last Push day. Controlled down, drive up.", done: false, rpe: null },
        { reps: 6, kg: 80, ai: "Match it — same bar speed. Don't chase it yet.", done: false, rpe: null },
        { reps: 6, kg: 80, ai: "Third set holds form over ego.", done: false, rpe: null },
        { reps: 6, kg: 82, ai: "Small bump if the last set moved clean.", done: false, rpe: null },
      ],
    },
    {
      name: "Incline DB Press",
      target: "3 × 10",
      rest: 90,
      sets: [{ reps: 10, kg: 28, ai: "Matched your last. Full stretch at the bottom.", done: false, rpe: null }],
    },
    {
      name: "Cable Fly",
      target: "3 × 15",
      rest: 60,
      sets: [{ reps: 15, kg: 0, ai: "New to your library — light, feel the chest, no momentum.", done: false, rpe: null }],
    },
  ],
  prDetected: { lift: "Bench Press", val: "82 kg × 6", note: "Best 6-rep bench — clean bar speed." },
};

const CAPTURE: CaptureData = {
  methods: [
    { id: "workout", icon: "grid", label: "Scan workout", sub: "Screenshot or photo to sets", tone: "green" },
    { id: "food", icon: "leaf", label: "Snap a meal", sub: "Photo to macros", tone: "green" },
    { id: "voice", icon: "bot", label: "Say it", sub: "Voice to logged", tone: "red" },
  ],
  workout: {
    steps: ["Reading image…", "Detecting exercises…", "Matching to your history…"],
    result: {
      title: "Push Day — imported",
      items: [
        { name: "Bench Press", detail: "4 × 6 · 80kg", note: "+2.5kg vs your last" },
        { name: "Incline DB Press", detail: "3 × 10 · 28kg", note: "matched" },
        { name: "Cable Fly", detail: "3 × 15", note: "new" },
      ],
      note: "Matched 3 of 3 lifts to your library — loads carried over from your last Push day.",
    },
  },
  food: {
    steps: ["Scanning plate…", "Identifying foods…", "Estimating macros…"],
    result: { title: "Chicken, rice & greens", cal: 680, p: 52, c: 78, f: 16, note: "Logged to Recovery. You're at 132g protein — 48g short of target." },
  },
  voice: {
    transcript: '"Logged a 35 minute zone two run, felt easy"',
    steps: ["Transcribing…", "Parsing intent…", "Writing to your log…"],
    result: { title: "Zone-2 Run · 35 min", detail: "≈ 5.8 km · +120 XP", note: "Streak held at 12 days." },
  },
};

const ADAPTIVE: AdaptivePlan = {
  reason: "Built from your last 4 weeks, your Hybrid goal, and a readiness dip this week.",
  missions: [
    { icon: "route", title: "Sub-25 5K Effort", tone: "green", xp: 250, days: 3, why: "Running is your Hybrid gap — 2/wk vs the 3 you need. Last tempo says sub-25 is in range." },
    { icon: "dumbbell", title: "Trap-Bar Progression", tone: "green", xp: 220, days: 5, why: "You PR'd at 110kg. One heavier top-set when fresh keeps the strength curve moving." },
    { icon: "moon", title: "Bank Three 7h Nights", tone: "amber", xp: 120, days: 4, why: "Sleep under 6h twice this week capped your readiness. Cheapest performance you can buy." },
  ],
};

const INSIGHTS: Insight[] = [
  { icon: "bolt", tone: "green", title: "Protein drives your squat", body: "On days protein clears 170g, your next-session squat load is up 6% on average. Under 140g, it stalls.", chip: "From 31 sessions" },
  { icon: "moon", tone: "amber", title: "Your PRs live on rest", body: "Every PR this block came the day after 7h+ sleep. None followed a sub-6h night. Sleep is your real program.", chip: "4 of 4 PRs" },
  { icon: "route", tone: "green", title: "Two runs is the floor", body: "Weeks with 2+ runs, your HRV trends up. One-run weeks it flattens. The endurance work recovers you.", chip: "12-week pattern" },
];

const PROOF: ProofData = {
  xp: [320, 410, 380, 520, 470, 610, 580, 690, 640, 760, 820, 940],
  load: [42, 48, 45, 60, 55, 52, 68, 64, 58, 72, 70, 66],
  prs: [
    { lift: "Trap-Bar Deadlift", val: "110 kg", delta: "+5", when: "Tue" },
    { lift: "5K Run", val: "24:38", delta: "-0:31", when: "Last wk" },
    { lift: "Back Squat", val: "120 kg", delta: "+2.5", when: "2 wk" },
    { lift: "Pull-up", val: "+20 kg", delta: "+2.5", when: "3 wk" },
  ],
  rarity: { "Iron Week": 9, "Trail Blazer": 14, Committed: 22 },
};

const SEASON: Season = {
  name: "Season 3 · The Long Climb",
  daysLeft: 18,
  progress: 0.64,
  reward: "Ascent Cape (Mythic frame)",
  rankInSeason: "Forged → Hybrid push",
};

const LEAGUE: League = {
  tier: "Granite League",
  note: "Top 4 promote. Power = collective proof, never followers.",
  standings: [
    { tribe: "Iron Valley", power: 61400, you: false, trend: "up" },
    { tribe: "Northside Run Club", power: 55900, you: false, trend: "up" },
    { tribe: "Sofia Barbarians", power: 48200, you: true, trend: "up" },
    { tribe: "Dawn Patrol", power: 44100, you: false, trend: "flat" },
    { tribe: "The Hold", power: 39800, you: false, trend: "down" },
    { tribe: "Late Shift", power: 31200, you: false, trend: "down" },
  ],
  verdict:
    "Sofia Barbarians moved 1,800 power this week — biggest jump in the league. Ivana's two runs and your trap-bar PR did most of it. Hold the line and you promote.",
};

const CHAPTERS: Chapter[] = [
  { num: "01", title: "Base Camp", span: "Apr", state: "done", beat: "You showed up 9 of your first 14 days. The habit took before the motivation faded." },
  { num: "02", title: "The First Forge", span: "May", state: "done", beat: "Three PRs in three weeks. You stopped calling it 'working out' and started calling it training." },
  { num: "03", title: "The Long Climb", span: "Now", state: "current", beat: "Strength is banked. The Hybrid push is on — runs are the front line. You're being written right now." },
  { num: "04", title: "Titan's Approach", span: "Locked", state: "locked", beat: "Where strength and endurance stop being a trade-off and start being your signature." },
];

const PRIVACY: PrivacyData = {
  intro:
    "Forge can only coach what it can see. You decide what that is. Toggle anything off and it's gone from every recommendation.",
  groups: [
    { label: "Recovery", items: [{ k: "Sleep & HRV (Whoop)", on: true }, { k: "Resting heart rate", on: true }] },
    { label: "Training", items: [{ k: "Workouts & sets", on: true }, { k: "Strava runs & routes", on: true }, { k: "PR history", on: true }] },
    { label: "Fuel", items: [{ k: "Meals & macros", on: true }, { k: "Hydration", on: false }] },
    { label: "Memory", items: [{ k: "Stated preferences & injuries", on: true }, { k: "Past conversations", on: true }] },
  ],
  footer: "Export everything · Delete my data — anytime, no friction.",
};

const ATLAS: Atlas = {
  currentXp: 12480,
  stations: [
    { rank: "Ascended", floor: 60000, state: "locked", emblem: "star", note: "Identity Forged", medals: [{ r: "mythic", emblem: "star", earned: false }] },
    { rank: "Titan", floor: 40000, state: "locked", emblem: "shield", medals: [{ r: "legendary", emblem: "mountain", earned: false }] },
    { rank: "Warrior", floor: 26000, state: "locked", emblem: "flame", medals: [{ r: "epic", emblem: "flame", earned: false }] },
    { rank: "Hybrid", floor: 16000, state: "next", emblem: "bolt", note: "3,520 XP away", medals: [{ r: "epic", emblem: "timer", earned: false }, { r: "epic", emblem: "target", earned: false }] },
    { rank: "Forged", floor: 10000, state: "current", emblem: "dumbbell", note: "You are here · 41%", medals: [{ r: "epic", emblem: "shield", earned: true }] },
    { rank: "Builder", floor: 2500, state: "done", emblem: "route", medals: [{ r: "rare", emblem: "flame", earned: true }, { r: "rare", emblem: "mountain", earned: true }] },
    { rank: "Initiate", floor: 0, state: "done", emblem: "leaf", note: "Base camp", medals: [{ r: "common", emblem: "dumbbell", earned: true }, { r: "common", emblem: "route", earned: true }, { r: "common", emblem: "users", earned: true }] },
  ],
  waypoints: [
    { icon: "bolt", title: "Sub-25 5K Effort", xp: 250, tone: "green" },
    { icon: "flame", title: "Hold The Line", xp: 400, tone: "red" },
  ],
};

const PLAN_IMPORT: PlanImport = {
  fileName: "coach_plan_w4.jpg",
  steps: ["Reading image…", "Detecting day structure…", "Parsing exercises & sets…", "Formatting as markdown…"],
  imported: `# Hypertrophy Block — Week 4
**Imported from** coach_plan_w4.jpg · 5 training days · 24 exercises

## Mon — Upper Push
- Barbell Bench Press — 4 × 6 @ 80kg
- Overhead Press — 3 × 8
- Incline DB Press — 3 × 10
- Cable Fly — 3 × 15
- Triceps Rope — 3 × 12

## Tue — Lower
- Back Squat — 4 × 5 @ 110kg
- Romanian Deadlift — 3 × 8
- Leg Press — 3 × 12
- Standing Calf Raise — 4 × 15

## Wed — Rest

## Thu — Upper Pull
- Weighted Pull-up — 4 × 6
- Barbell Row — 4 × 8
- Lat Pulldown — 3 × 12
- Face Pull — 3 × 15
- Barbell Curl — 3 × 12

## Fri — Lower Power
- Trap-Bar Deadlift — 5 × 3 @ 105kg
- Front Squat — 3 × 6
- Walking Lunge — 3 × 10
- Hanging Leg Raise — 3 × 12`,
  adaptNote:
    "I read all 5 days and kept the strength intent. Then I tuned it to your actual week — 62% readiness, two sub-6h nights, Tuesday's trap-bar PR, your left knee, and the Hybrid goal that needs a third run. Changes are highlighted.",
  adapted: `# Hypertrophy Block — Week 4 · Tuned for you
**Adapted by Forge** · readiness 62% · 5 days, recovery-aware

## Mon — Upper Push
- Barbell Bench Press — 4 × 6 @ 80kg
- Overhead Press — 3 × 8
- Incline DB Press — 3 × 10
- Cable Fly — 3 × 15

## Tue — Lower (deloaded)
~- Back Squat — 4 × 5 @ 100kg  ↓ trimmed, you PR'd Tuesday
- Romanian Deadlift — 3 × 8
- Leg Press — 3 × 12

## Wed — Zone-2 Run
~- 35 min easy run  + added for your Hybrid goal

## Thu — Lower Power (moved up)
~- Trap-Bar Deadlift — 5 × 3 @ 105kg  ← moved from Fri, you're freshest
- Front Squat — 3 × 6
~- Bulgarian Split Squat — 3 × 10  ⟲ subbed off your left knee
- Hanging Leg Raise — 3 × 12

## Fri — Upper Pull
- Weighted Pull-up — 4 × 6
- Barbell Row — 4 × 8
- Lat Pulldown — 3 × 12
- Barbell Curl — 3 × 12`,
  changes: [
    { icon: "moon", t: "Trimmed Tuesday squat load — recovery-first after your PR" },
    { icon: "route", t: "Added a Zone-2 run — your Hybrid goal needs a third run/week" },
    { icon: "dumbbell", t: "Moved Lower Power to Thursday — you're freshest mid-week" },
    { icon: "heart", t: "Swapped walking lunge → split squat to protect your left knee" },
  ],
};

/**
 * The mocked agent service. Mirrors what the real A6 context assembler + B1/B3/B4
 * endpoints will return. Small latencies keep the scanning/typing states honest.
 */
export const agentMock = {
  async getContext(): Promise<AthleteContext> {
    return CONTEXT;
  },
  async getTodayBrief(): Promise<TodayBrief> {
    return TODAY_BRIEF;
  },
  async getNudge(): Promise<Nudge> {
    return NUDGE;
  },
  async getCheckin(): Promise<Checkin> {
    return CHECKIN;
  },
  async getCoachConversation(): Promise<CoachConversation> {
    return COACH;
  },
  async getLiveWorkout(): Promise<LiveWorkout> {
    return LIVE_WORKOUT;
  },
  async getScannedWorkout(): Promise<LiveWorkout> {
    return SCANNED_WORKOUT;
  },
  async getCapture(): Promise<CaptureData> {
    return CAPTURE;
  },
  async generateAdaptivePlan(): Promise<AdaptivePlan> {
    await delay(1500);
    return ADAPTIVE;
  },
  async getInsights(): Promise<Insight[]> {
    return INSIGHTS;
  },
  async getPlanImport(): Promise<PlanImport> {
    return PLAN_IMPORT;
  },
  async getProof(): Promise<ProofData> {
    return PROOF;
  },
  async getSeason(): Promise<Season> {
    return SEASON;
  },
  async getLeague(): Promise<League> {
    return LEAGUE;
  },
  async getChapters(): Promise<Chapter[]> {
    return CHAPTERS;
  },
  async getPrivacy(): Promise<PrivacyData> {
    return PRIVACY;
  },
  async getAtlas(): Promise<Atlas> {
    return ATLAS;
  },
};
