import { test, expect, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const api = "http://localhost:9511/v1";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

let headers: Record<string, string> = {};

test.beforeEach(async ({ request, context }, info) => {
  const failures: string[] = [];
  const diagnostics = { name: "api-failures", contentType: "text/plain", body: Buffer.from("") };
  context.on("response", (response) => {
    // The fixture runs no AI service: race-team calls are expected to fail.
    if (response.url().startsWith(api) && response.status() >= 400 && !response.url().includes("/ai/")) {
      failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
      diagnostics.body = Buffer.from(failures.join("\n"));
    }
  });
  info.annotations.push({ type: "fixture", description: "Real isolated auth/user/training/gateway; no API mocks; no AI service" });
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
  // Photo search needs the AI service, which this fixture doesn't run: skipping is always allowed.
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
