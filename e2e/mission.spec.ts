import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const api = "http://localhost:9511/v1";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let headers: Record<string, string> = {};

test.beforeEach(async ({ request, context }, info) => {
  const failures: string[] = [];
  const diagnostics = { name: "api-failures", contentType: "text/plain", body: Buffer.from("") };
  context.on("response", (response) => {
    // The race team runs without an Anthropic key: AI-only calls may fail by design.
    if (response.url().startsWith(api) && response.status() >= 400 && !response.url().includes("/ai/")) {
      failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
      diagnostics.body = Buffer.from(failures.join("\n"));
    }
  });
  info.annotations.push({ type: "fixture", description: "Real isolated auth/user/training/AI orchestrator (no Anthropic key)/gateway; no API mocks" });
  // Retain only statuses/paths, never headers, tokens or personal payloads.
  info.attachments.push(diagnostics);
  const registration = await request.post(`${api}/auth/register`, {
    data: { email: `browser-${randomUUID()}@example.com`, password: `Test-${randomUUID()}-only`, display_name: "Browser Test" },
  });
  expect(registration.status()).toBe(201);
  const { tokens } = await registration.json();
  headers = { Authorization: `Bearer ${tokens.access_token}` };
  expect((await request.post(`${api}/users/onboarding`, { headers, data: {
    display_name: "Browser Test", identity_statement: "Synthetic browser test", transformation_goal: "build_endurance",
    training_level: "intermediate", weekly_target_days: 4, timezone: "Europe/Sofia", screen: "identity",
  } })).ok()).toBeTruthy();
  const legal = await (await request.get(`${api}/users/me/legal`, { headers })).json();
  expect((await request.post(`${api}/users/me/legal/accept`, { headers, data: {
    acceptances: legal.documents.map((doc: { document_type: string; required_version: string }) => ({ document_type: doc.document_type, version: doc.required_version })),
  } })).ok()).toBeTruthy();
  await context.addInitScript((pair) => {
    if (!localStorage.getItem("strem.test.initialized")) {
      localStorage.setItem("strem.access_token", pair.access_token);
      localStorage.setItem("strem.refresh_token", pair.refresh_token);
      localStorage.setItem("strem.test.initialized", "true");
    }
  }, tokens);
});

/** A calendar date about four months ahead, in the setup calendar's terms. */
function raceDay() {
  const d = new Date();
  d.setUTCDate(15);
  d.setUTCMonth(d.getUTCMonth() + 4);
  return { month: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, iso: d.toISOString().slice(0, 10) };
}

async function createMissionViaApi(request: APIRequestContext, name: string) {
  const response = await request.post(`${api}/race-missions`, {
    headers: { ...headers, "Idempotency-Key": `e2e_${randomUUID().replaceAll("-", "")}` },
    data: {
      event: { name, race_date: raceDay().iso, timezone: "Europe/Sofia", location_name: "Test Valley", distance_km: 30, sport: "trail_running" },
      goal: { outcome: "finish_confidently" },
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()) as { id: string };
}

async function continueStep(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test("set up a race in seven steps, commit, and land on its Mission screen", async ({ page }) => {
  const day = raceDay();
  await page.goto("/home");
  await page.getByRole("button", { name: "Start a Race Mission", exact: true }).click();
  await page.getByRole("radio", { name: /Trail & mountain running/ }).click();

  await page.getByLabel("Race or challenge name", { exact: true }).fill("Synthetic Ridge 30K");
  await page.getByRole("button", { name: day.month, exact: true }).click();
  await page.getByRole("button", { name: day.iso, exact: true }).click();
  await page.getByLabel("Where it starts", { exact: true }).fill("Test Valley");
  await continueStep(page);

  await page.getByLabel("Distance", { exact: true }).fill("30");
  await page.getByLabel("Elevation gain", { exact: true }).fill("1600");
  await continueStep(page);
  await page.getByLabel("Why does this race matter to you?", { exact: true }).fill("Synthetic motivation.");
  await continueStep(page);
  // Photo search needs live AI, which this fixture has no key for: skipping is always allowed.
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByLabel("Hours available / week", { exact: true }).fill("7");
  await continueStep(page);

  await expect(page.getByText("Synthetic Ridge 30K").first()).toBeVisible();
  await page.getByRole("button", { name: /Commit & build/ }).click();
  // The race is saved even when the race team is unreachable; the build reports it.
  await page.getByRole("button", { name: "Open my Race Mission", exact: true }).click({ timeout: 30000 });

  await expect(page.getByRole("heading", { name: "Synthetic Ridge 30K" })).toBeVisible();
  await expect(page.getByText(/days? to the start line/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Synthetic Ridge 30K" })).toBeVisible();
});

test("upload a course GPX in Race Lab and see its stats after reload", async ({ page, request }) => {
  await createMissionViaApi(request, "Synthetic Course Race");
  const points = Array.from({ length: 40 }, (_, i) => {
    const lat = (42.1 + i * 0.002).toFixed(5);
    const ele = 900 + Math.round(120 * Math.sin(i / 5));
    return `<trkpt lat="${lat}" lon="23.30000"><ele>${ele}</ele></trkpt>`;
  }).join("");
  const gpx = `<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="synthetic"><trk><trkseg>${points}</trkseg></trk></gpx>`;

  await page.goto("/race?tab=course");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Upload GPX / ZIP", exact: true }).click();
  await (await chooser).setFiles({ name: "synthetic.gpx", mimeType: "application/gpx+xml", buffer: Buffer.from(gpx) });

  await expect(page.getByText("from your GPX")).toBeVisible({ timeout: 30000 });
  await page.reload();
  await expect(page.getByText("from your GPX")).toBeVisible();
  // File options fold away once a course is saved.
  await page.getByRole("link", { name: "Course file & source", exact: true }).click();
  await expect(page.getByRole("button", { name: "Replace GPX / ZIP", exact: true })).toBeVisible();
});

test("export and permanently delete all mission data", async ({ page, request }) => {
  await createMissionViaApi(request, "Synthetic Export Race");
  await page.goto("/mission-data");
  await page.getByRole("button", { name: "Prepare my export", exact: true }).click();
  await expect(page.getByText(/^1 missions/)).toBeVisible();

  const phrase = "DELETE MY RACE MISSIONS";
  await page.getByLabel(`Type ${phrase} to confirm`, { exact: true }).fill(phrase);
  await page.getByRole("button", { name: "Permanently delete", exact: true }).click();
  await expect(page.getByText(/were deleted/)).toBeVisible();

  await page.goto("/home");
  await expect(page.getByRole("button", { name: "Start a Race Mission", exact: true })).toBeVisible();
  const remaining = await (await request.get(`${api}/race-missions`, { headers })).json();
  expect(remaining.items).toHaveLength(0);
});

test("import my own plan from pasted text, review it and train from it", async ({ page, request }) => {
  await createMissionViaApi(request, "Synthetic Import Race");
  await page.goto("/plan");
  await page.getByRole("button", { name: "Import my plan", exact: true }).click();

  const text = ["Week 1 - base", "Mon: rest", "Tue: easy 40 min", "Thu: hills 50 min", "Sat: long trail 1h45 16 km 500 m+", "Week 2 - build", "Tue: easy 45 min", "Thu: tempo 55 min", "Sat: long trail 2h 18 km 700 m+"].join("\n");
  await page.getByLabel("…or paste your plan", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Read my plan (1)", exact: true }).click();

  // No Anthropic key in this fixture: the offline text reader transcribes it and says so.
  await expect(page.getByText("Read without the AI race team")).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Your plan — 2 weeks")).toBeVisible();
  await expect(page.getByText("Week 2 · Build")).toBeVisible();
  await page.getByRole("button", { name: /^Remove Tempo/ }).click();
  await expect(page.getByRole("button", { name: /^Remove Tempo/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Save as my plan", exact: true }).click();
  // Back on the Plan tab, the saved plan is marked as the athlete's own.
  await expect(page.getByRole("link", { name: "Why this week" })).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel("Your plan", { exact: true })).toBeVisible({ timeout: 30000 });
  const saved = await (await request.get(`${api}/race-missions`, { headers })).json();
  const plan = await (await request.get(`${api}/training/missions/${saved.items[0].id}/plan`, { headers })).json();
  expect(plan.origin).toBe("athlete");
  expect(plan.content.weeks.flatMap((w: { sessions: { title: string }[] }) => w.sessions).some((s: { title: string }) => /tempo/i.test(s.title))).toBe(false);

});

test("switch to another race from inside Race Lab", async ({ page, request }) => {
  await createMissionViaApi(request, "Synthetic First Race");
  await createMissionViaApi(request, "Synthetic Second Race");
  await page.goto("/race");
  const switcher = page.getByRole("button", { name: /^Switch race\. Current:/ });
  await expect(switcher).toBeVisible();
  const current = ((await switcher.getAttribute("aria-label")) ?? "").replace("Switch race. Current: ", "");
  const other = current === "Synthetic First Race" ? "Synthetic Second Race" : "Synthetic First Race";
  await switcher.click();
  await page.getByRole("radio", { name: new RegExp(`^${other},`) }).click();
  await expect(page.getByRole("button", { name: `Switch race. Current: ${other}` })).toBeVisible();
  // Still in Race Lab, and the choice holds across tabs.
  await expect(page.getByRole("heading", { name: "Execute race day" })).toBeVisible();
  await page.goto("/plan");
  await expect(page.getByRole("button", { name: `Switch race. Current: ${other}` }).or(page.getByText(other).first())).toBeVisible();
});

test("bring my own plan with no race and see it as my plan", async ({ page, request }) => {
  await page.goto("/plan");
  await expect(page.getByText("No plan yet")).toBeVisible();
  await page.getByRole("button", { name: "Import my plan", exact: true }).click();
  const text = ["Day\tMorning\tEvening", "Monday\tFull Rest\t-", "Tuesday\tSwim A\tStrength A", "Thursday\tEasy run 45 min\t-", "Saturday\tLong run 1h30\t-"].join("\n");
  await page.getByLabel("…or paste your plan", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Read my plan (1)", exact: true }).click();
  await expect(page.getByText(/→ .* · your own plan$/)).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Repeat for 8 weeks", exact: true }).click();
  await expect(page.getByText("Your plan — 8 weeks")).toBeVisible();
  await page.getByRole("button", { name: "Save as my plan", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Your training" })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Your own plan").first()).toBeVisible();
  const plan = await (await request.get(`${api}/training/plan`, { headers })).json();
  expect(plan.content.weeks).toHaveLength(8);
  expect(plan.content.weeks.every((w: { source: string }) => w.source === "base")).toBe(true);
});

test("change a race's priority from My races and see the clash warning go away", async ({ page, request }) => {
  await createMissionViaApi(request, "Synthetic Peak 50K");
  const earlier = new Date(`${raceDay().iso}T12:00:00Z`);
  earlier.setUTCDate(earlier.getUTCDate() - 42);
  const tuneUp = await request.post(`${api}/race-missions`, {
    headers: { ...headers, "Idempotency-Key": `e2e_${randomUUID().replaceAll("-", "")}` },
    data: { event: { name: "Synthetic Tune-up 25K", race_date: earlier.toISOString().slice(0, 10), timezone: "Europe/Sofia", location_name: "Test Valley", distance_km: 25, sport: "trail_running" }, goal: { outcome: "finish_confidently" } },
  });
  expect(tuneUp.status()).toBe(201);
  await page.goto("/missions");
  await expect(page.getByText("Races clash")).toBeVisible();
  // The earlier race (listed first) becomes the B race.
  await page.getByRole("button", { name: "A race — change priority" }).first().click();
  await page.getByRole("radio", { name: /^B race/ }).click();
  await expect(page.getByText("Now a B race")).toBeVisible();
  await page.getByRole("button", { name: "Re-plan around this", exact: true }).click();
  await expect(page.getByText(/re-planned|No race plan to change yet/i)).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("Races clash")).toHaveCount(0);
  const missions = await (await request.get(`${api}/race-missions`, { headers })).json();
  expect(missions.items.map((m: { goal: { priority?: string } }) => m.goal.priority ?? "A").sort()).toEqual(["A", "B"]);
});

test("missed sessions: the race team adjusts the week and I apply it", async ({ page, request }) => {
  const { id } = await createMissionViaApi(request, "Synthetic Missed Race");
  const day = (offset: number) => {
    const d = new Date();
    d.setUTCHours(12, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const mondayOf = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  const planned = [
    { id: "past-long", offset: -5, kind: "long", minutes: 120, key: true },
    { id: "past-tempo", offset: -3, kind: "tempo", minutes: 50, key: true },
    { id: "past-easy", offset: -2, kind: "easy", minutes: 40, key: false },
    { id: "next-tempo", offset: 1, kind: "tempo", minutes: 50, key: true },
    { id: "next-hills", offset: 3, kind: "hills", minutes: 55, key: false },
    { id: "next-long", offset: 5, kind: "long", minutes: 130, key: true },
  ].map((s) => ({ id: s.id, date: day(s.offset), sport: "trail_running", kind: s.kind, title: s.id.replace("-", " "), duration_minutes: s.minutes, key: s.key }));
  const mondays = [...new Set(planned.map((s) => mondayOf(s.date)))].sort();
  const weeks = mondays.map((m, i) => ({ index: i + 1, start_date: m, phase: "build", focus: "Synthetic week", sessions: planned.filter((s) => mondayOf(s.date) === m) }));
  const put = await request.put(`${api}/training/missions/${id}/plan`, {
    headers: { ...headers, "If-Match": '"0"' },
    data: { origin: "engine", content: { headline: "Synthetic plan", sport: "trail_running", timezone: "UTC", start_date: mondays[0], race_date: raceDay().iso, weeks } },
  });
  expect(put.status()).toBe(200);

  await page.goto("/home");
  await expect(page.getByText("Your race team adjusted this week")).toBeVisible({ timeout: 30000 });
  await page.getByRole("link", { name: /^See \d+ change/ }).click();
  await page.getByRole("button", { name: "Apply changes", exact: true }).click();
  await expect(page.getByText("Your race team adjusted this week")).toHaveCount(0, { timeout: 30000 });
  const plan = await (await request.get(`${api}/training/missions/${id}/plan`, { headers })).json();
  const hills = plan.content.weeks.flatMap((w: { sessions: { id: string; kind: string }[] }) => w.sessions).find((s: { id: string }) => s.id === "next-hills");
  expect(hills.kind).toBe("easy");
});

test("add checkpoints in Race Lab and get a leg-by-leg checkpoint plan", async ({ page, request }) => {
  const { id } = await createMissionViaApi(request, "Synthetic Checkpoint 30K");
  await page.goto("/race?tab=strategy");
  await page.getByRole("button", { name: "Build race strategy", exact: true }).click();
  await expect(page.getByText("Segment plan")).toBeVisible({ timeout: 30000 });
  for (const [name, km, cutoff] of [["Hut", "10", "2:30"], ["Pass", "20", ""]]) {
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByLabel("Distance from start", { exact: true }).fill(km);
    if (cutoff) await page.getByLabel("Cutoff from start", { exact: true }).fill(cutoff);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("button", { name: new RegExp(`^Edit ${name}, km`) })).toBeVisible({ timeout: 30000 });
  }
  await expect(page.getByText("Checkpoint plan")).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Start → Hut/)).toBeVisible();
  const mission = await (await request.get(`${api}/race-missions/${id}`, { headers })).json();
  expect(mission.event.checkpoints.map((c: { name: string }) => c.name)).toEqual(["Hut", "Pass"]);
});

test("a past race's stomach trouble shapes the fuel plan", async ({ page, request }) => {
  const past = await request.post(`${api}/users/me/races`, {
    headers,
    data: { name: "Synthetic Gut 50K", race_date: "2026-05-10", distance_km: 50, status: "finished", lessons: ["Carry more salt in heat"], race_day: { carbs_g_per_hour: 70, gi_issues: "severe", pacing: "faded" } },
  });
  expect(past.status()).toBe(201);
  await createMissionViaApi(request, "Synthetic Fuel Race");
  await page.goto("/race?tab=fuel");
  await page.getByRole("button", { name: /^Build .*fuel/i }).click();
  await expect(page.getByText("From your races")).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("70 g/h was too much at Synthetic Gut 50K")).toBeVisible();
});

test("Strava routes picker explains when Strava isn't available", async ({ page, request }) => {
  await createMissionViaApi(request, "Synthetic Strava Race");
  await page.goto("/race?tab=course");
  await page.getByRole("button", { name: "From Strava", exact: true }).click();
  await expect(page.getByText("Your Strava routes")).toBeVisible();
  // This fixture has no Strava app configured: the sheet says so instead of spinning.
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible({ timeout: 15000 });
});

test("create a season, let the race team draft its plan, and train from it", async ({ page, request }) => {
  await page.goto("/plan");
  await expect(page.getByText("No plan yet")).toBeVisible();
  await page.getByRole("button", { name: "New season", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Winter base");
  await page.getByRole("button", { name: "Save season", exact: true }).click();
  await page.getByRole("button", { name: "Season Winter base", exact: true }).click();
  await page.getByRole("button", { name: "Generate season plan", exact: true }).click();
  // The plan appears as soon as it is built (the empty Plan tab becomes the timeline).
  await expect(page.getByRole("heading", { name: "Your training" })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("button", { name: "Season Winter base", exact: true })).toContainText("plan ready");
  await expect(page.getByText("Winter base").first()).toBeVisible();
  const plan = await (await request.get(`${api}/training/plan`, { headers })).json();
  expect(plan.seasons[0]).toMatchObject({ name: "Winter base", has_plan: true, current: true });
  expect(plan.content.weeks[0].source).toBe("season");
});

test("importing races from Strava without a connection says to connect first", async ({ page }) => {
  await page.goto("/history");
  await page.getByRole("button", { name: "Import from Strava" }).click();
  await expect(page.getByText("Strava import didn’t run")).toBeVisible();
  await expect(page.getByText("Connect Strava first, then import your races.")).toBeVisible();
  await page.getByRole("button", { name: "Connected sources" }).click();
  await expect(page).toHaveURL(/\/integrations/);
});
