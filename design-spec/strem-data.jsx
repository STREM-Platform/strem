// strem-data.jsx — STREM demo data (mirrors the real contract shapes)

const DATA = {
  athlete: {
    name: "Deyan", handle: "@deyan.forged", initials: "DK",
    rank: "Forged", rankIndex: 3, rankCount: 7, nextRank: "Hybrid",
    totalXp: 12480, intoRank: 2480, rankSpan: 6000,
    streak: 12, longest: 21, weekSessions: 4, weekTarget: 5, activeDays: 47,
    identity: "I am an athlete who never settles.",
    goal: "Hybrid athlete", level: "Intermediate",
  },
  ranks: [
    { name: "Initiate", floor: 0 }, { name: "Builder", floor: 2500 },
    { name: "Forged", floor: 10000 }, { name: "Hybrid", floor: 16000 },
    { name: "Warrior", floor: 26000 }, { name: "Titan", floor: 40000 },
    { name: "Ascended", floor: 60000 },
  ],
  missions: [
    { id: "m1", icon: "bolt", title: "Sub-25 5K Effort", type: "Performance", diff: "Growth",
      xp: 250, days: 3, cond: "Run 5K under 25:00", prog: 0, tone: "green", rarity: "epic" },
    { id: "m2", icon: "dumbbell", title: "Three Iron Sessions", type: "Discipline", diff: "Maintenance",
      xp: 180, days: 5, cond: "Log 3 strength sessions", prog: 0.66, tone: "neutral", rarity: "rare", sub: "2 of 3 done" },
    { id: "m3", icon: "moon", title: "Dial In Recovery", type: "Recovery", diff: "Re-entry",
      xp: 120, days: 4, cond: "7h+ sleep, 4 nights", prog: 0.5, tone: "neutral", rarity: "common", sub: "2 of 4 nights" },
    { id: "m4", icon: "flame", title: "Hold The Line", type: "Hybrid", diff: "Challenge",
      xp: 400, days: 2, cond: "Train + run + fuel, same week", prog: 0.33, tone: "red", rarity: "legendary", sub: "1 of 3 pillars" },
  ],
  week: [
    { d: "M", on: true, type: "strength" }, { d: "T", on: true, type: "running" },
    { d: "W", on: false }, { d: "T", on: true, type: "strength" },
    { d: "F", on: true, type: "running" }, { d: "S", on: false }, { d: "S", on: false },
  ],
  sessionTypes: [
    { id: "strength", icon: "dumbbell", label: "Strength", hint: "Lift, push, build", tone: "green" },
    { id: "running", icon: "route", label: "Running", hint: "Road, trail, track", tone: "green" },
    { id: "mobility", icon: "refresh", label: "Mobility", hint: "Flow, stretch, reset", tone: "neutral" },
    { id: "hyrox", icon: "timer", label: "Hybrid / HYROX", hint: "Mixed-modal grind", tone: "red" },
  ],
  recentSessions: [
    { type: "running", label: "Tempo Run", meta: "8.2 km · 41 min", xp: 120, when: "Today" },
    { type: "strength", label: "Lower Power", meta: "52 min · RPE 8", xp: 140, when: "Yesterday" },
    { type: "strength", label: "Upper Push", meta: "48 min · RPE 7", xp: 130, when: "2d ago" },
  ],
  nutrition: {
    todayMet: null, streak: 9,
    pillars: [
      { id: "protein", icon: "bolt", label: "Protein hit", on: true },
      { id: "whole", icon: "leaf", label: "Whole foods", on: true },
      { id: "hydration", icon: "compass", label: "Hydrated", on: false },
    ],
    days: [
      { d: "M", met: true }, { d: "T", met: true }, { d: "W", met: false },
      { d: "T", met: true }, { d: "F", met: true }, { d: "S", met: true }, { d: "S", met: null },
    ],
  },
  tribe: {
    name: "Sofia Barbarians", role: "Member", power: 48200, members: 7, max: 10,
    mission: "Small group. Relentless direction.",
    challenge: { title: "1,000 km Collective", type: "running", cur: 642, target: 1000, days: 9 },
    feed: [
      { who: "Ivana M.", action: "running", note: "Trail intervals before work.", when: "12m", you: false },
      { who: "You", action: "strength", note: "Lower power — PR on trap bar.", when: "1h", you: true },
      { who: "Petar G.", action: "recovery", note: "Mobility + sauna reset.", when: "3h", you: false },
      { who: "Mila R.", action: "nutrition", note: "Dialed protein all day.", when: "5h", you: false },
    ],
    checkins: [
      { id: "training", icon: "dumbbell", label: "Trained" },
      { id: "running", icon: "route", label: "Ran" },
      { id: "nutrition", icon: "leaf", label: "Fueled" },
      { id: "recovery", icon: "moon", label: "Recovered" },
      { id: "rest", icon: "heart", label: "Rest day" },
      { id: "nothing", icon: "minus", label: "Nothing yet" },
    ],
  },
  coach: {
    week: "Jun 9 – Jun 15",
    narrative: "You held the line this week, Deyan. Four sessions logged, two of them running — your endurance base is widening exactly when it needs to. The midweek gap on Wednesday wasn't a break in discipline; it was recovery you'd earned. What stands out is the trap-bar PR inside a fatigued block. That's not a peak-motivation win — that's the system working when motivation was average. Stay on the running thread next week and Hybrid is within reach.",
    proof: [
      { label: "Training", v: 4, max: 5, tone: "green" },
      { label: "Running", v: 2, max: 3, tone: "green" },
      { label: "Nutrition", v: 5, max: 7, tone: "green" },
      { label: "Tribe", v: 3, max: 4, tone: "neutral" },
    ],
    outcomes: [
      { icon: "dumbbell", label: "Three Iron Sessions", state: "done", xp: 180 },
      { icon: "route", label: "Build The Base", state: "done", xp: 150 },
      { icon: "moon", label: "Sleep Reset", state: "missed", xp: 0 },
    ],
  },
  medals: [
    { t: "First Iron", r: "common", emblem: "dumbbell", cat: "Strength", earned: true, when: "Apr 2", cond: "Log your first strength session.", xp: 50 },
    { t: "First Mile", r: "common", emblem: "route", cat: "Endurance", earned: true, when: "Apr 2", cond: "Log your first run.", xp: 50 },
    { t: "Tribe Member", r: "common", emblem: "users", cat: "Competition", earned: true, when: "Apr 9", cond: "Join a tribe, post a check-in.", xp: 60 },
    { t: "Committed", r: "rare", emblem: "flame", cat: "Consistency", earned: true, when: "Apr 21", cond: "Stay active 7 days in a row.", xp: 120 },
    { t: "Iron Week", r: "epic", emblem: "shield", cat: "Strength", earned: true, when: "May 6", cond: "Train, run & fuel in one week.", xp: 250 },
    { t: "Trail Blazer", r: "rare", emblem: "mountain", cat: "Endurance", earned: true, when: "May 18", cond: "Log a trail run over 10 km.", xp: 140 },
    { t: "Unbroken", r: "rare", emblem: "bolt", cat: "Consistency", earned: false, cond: "Stay active 14 days in a row.", xp: 200 },
    { t: "30-Day Mark", r: "epic", emblem: "target", cat: "Consistency", earned: false, cond: "Log activity on 30 days.", xp: 300 },
    { t: "Long Hauler", r: "epic", emblem: "timer", cat: "Endurance", earned: false, cond: "Log 25 running sessions.", xp: 320 },
    { t: "Hyrox Forged", r: "epic", emblem: "flame", cat: "Competition", earned: false, cond: "Finish a full HYROX simulation.", xp: 350 },
    { t: "Relentless", r: "legendary", emblem: "mountain", cat: "Consistency", earned: false, cond: "Stay active 30 days in a row.", xp: 600 },
    { t: "Identity Forged", r: "mythic", emblem: "star", cat: "Special", earned: false, cond: "Reach the Ascended rank.", xp: 1000 },
  ],
  onboarding: [
    { key: "welcome", emblem: "mountain", overline: "Step 1 · Welcome", title: "Never settle.",
      body: "STREM is an identity system, not a tracker. We'll define who you're becoming, then make the proof visible." },
    { key: "identity", emblem: "compass", overline: "Step 2 · Identity", title: "Name the climb.",
      body: "Choose the identity you're building. Your AI coach holds you to it.",
      options: [
        { icon: "dumbbell", label: "Build strength", sub: "Get powerful & resilient" },
        { icon: "route", label: "Build endurance", sub: "Go longer, recover faster" },
        { icon: "bolt", label: "Hybrid athlete", sub: "Strong and conditioned", pick: true },
        { icon: "shield", label: "Build discipline", sub: "Show up no matter what" },
      ] },
    { key: "training", emblem: "dumbbell", overline: "Step 3 · Background", title: "Where are you now?",
      body: "We tune missions to your level — honest, not flattering.",
      options: [
        { icon: "leaf", label: "Beginner", sub: "New or returning" },
        { icon: "flame", label: "Intermediate", sub: "Consistent for months", pick: true },
        { icon: "trophy", label: "Advanced", sub: "Years of structured work" },
      ] },
    { key: "commitment", emblem: "flame", overline: "Step 4 · Commitment", title: "How many days?",
      body: "Pick a cadence you'll keep on an average week, not your best one.",
      cadence: true },
    { key: "tribe", emblem: "users", overline: "Step 5 · Tribe", title: "Climb with others.",
      body: "Small tribes — not followers. People who expect you back.",
      options: [
        { icon: "users", label: "Join a tribe now", sub: "Get matched to a group", pick: true },
        { icon: "compass", label: "Browse later", sub: "Start solo, join soon" },
        { icon: "shield", label: "Solo for now", sub: "Just me and the coach" },
      ] },
    { key: "launch", emblem: "star", overline: "Step 6 · Launch", title: "Initiate.",
      body: "Your climb starts at rank Initiate. First proof unlocks the system." },
  ],

  // ── Structured workout import + execution ────────────────────────────────
  importMethods: [
    { id: "photo", icon: "grid", label: "Scan a screenshot", sub: "Import a workout from an image", tone: "green" },
    { id: "text", icon: "edit", label: "Paste text", sub: "From notes, a coach, a PDF", tone: "green" },
    { id: "manual", icon: "plus", label: "Build manually", sub: "Add exercises yourself", tone: "neutral" },
    { id: "voice", icon: "bot", label: "Voice / AI generate", sub: "Describe it — AI builds it", tone: "red", soon: true },
  ],
  workout: {
    title: "Lower Power — Block B",
    type: "strength",
    source: "Imported from screenshot",
    est: 52, xp: 220,
    exercises: [
      { name: "Trap-Bar Deadlift", kind: "lift", note: "Explosive up, controlled down",
        sets: [ { reps: 5, kg: 100 }, { reps: 5, kg: 100 }, { reps: 5, kg: 105 }, { reps: 3, kg: 110 } ], rest: 150 },
      { name: "Bulgarian Split Squat", kind: "lift", note: "Each leg",
        sets: [ { reps: 8, kg: 24 }, { reps: 8, kg: 24 }, { reps: 8, kg: 24 } ], rest: 90 },
      { name: "Nordic Hamstring Curl", kind: "lift", note: "Slow eccentric",
        sets: [ { reps: 6 }, { reps: 6 }, { reps: 5 } ], rest: 90 },
      { name: "Standing Calf Raise", kind: "lift", note: "Full stretch",
        sets: [ { reps: 15, kg: 40 }, { reps: 15, kg: 40 }, { reps: 15, kg: 40 } ], rest: 60 },
    ],
  },

  // ── Nutrition / fueling (performance-framed macros) ──────────────────────
  fuel: {
    streak: 9,
    targets: { cal: 2600, protein: 180, carbs: 280, fat: 80, water: 3.0 },
    today: { cal: 1840, protein: 132, carbs: 188, fat: 56, water: 1.8 },
    logMethods: [
      { id: "photo", icon: "grid", label: "Snap a photo", sub: "AI estimates the macros", tone: "green" },
      { id: "voice", icon: "bot", label: "Say what you ate", sub: "Voice → logged in seconds", tone: "green" },
      { id: "manual", icon: "edit", label: "Search & add", sub: "Manual entry", tone: "neutral" },
    ],
    meals: [
      { name: "Oats, whey & berries", time: "07:10", tag: "Pre-train", method: "voice",
        cal: 520, p: 38, c: 72, f: 10, tone: "green" },
      { name: "Chicken, rice & greens", time: "12:40", tag: "Recovery", method: "photo",
        cal: 680, p: 52, c: 78, f: 16, tone: "green" },
      { name: "Greek yogurt & honey", time: "16:05", tag: "Snack", method: "manual",
        cal: 240, p: 22, c: 24, f: 6, tone: "neutral" },
      { name: "Salmon & sweet potato", time: "19:30", tag: "Dinner", method: "photo",
        cal: 400, p: 20, c: 14, f: 24, tone: "green" },
    ],
  },

  // ── Shareable recaps (IG-story templates) ────────────────────────────────
  recaps: [
    { id: "weekly", label: "Weekly Recap", icon: "chart", period: "This week", tone: "green" },
    { id: "monthly", label: "Monthly Recap", icon: "compass", period: "May", tone: "green" },
    { id: "medal", label: "Medal Unlock", icon: "medal", period: "New", tone: "legendary" },
    { id: "training", label: "Training Progress", icon: "dumbbell", period: "Block B", tone: "green" },
    { id: "nutrition", label: "Fueling Recap", icon: "leaf", period: "7 days", tone: "green" },
    { id: "pr", label: "Personal Record", icon: "bolt", period: "Trap-Bar DL", tone: "red" },
  ],
};

Object.assign(window, { DATA });
