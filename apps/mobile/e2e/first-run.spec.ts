import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

// The first run from zero (#4): a brand-new account goes from the register form to
// its first race, plan and brief with nothing pre-filled and no API shortcuts.
// Set STREM_SHOTS to a folder to keep a screenshot of every step for review.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
let shot = 0;

async function snap(page: Page, name: string) {
  const dir = process.env.STREM_SHOTS;
  if (dir) await page.screenshot({ path: `${dir}/${String(++shot).padStart(2, "0")}-${name}.png`, fullPage: true });
}

function raceDay() {
  const d = new Date();
  d.setUTCDate(15);
  d.setUTCMonth(d.getUTCMonth() + 4);
  return { month: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`, iso: d.toISOString().slice(0, 10) };
}

test("a brand-new athlete registers and reaches a first race, plan and brief", async ({ page }) => {
  test.setTimeout(120000);
  const continueStep = () => page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.goto("/register");
  await snap(page, "register");
  await page.getByLabel("Name", { exact: true }).fill("Mira");
  await page.getByLabel("Email", { exact: true }).fill(`first-run-${randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(`Test-${randomUUID()}-only`);
  await page.getByRole("button", { name: "Create account", exact: true }).click();

  const agree = page.getByRole("button", { name: /I agree/ });
  await expect(agree).toBeVisible({ timeout: 20000 });
  await snap(page, "legal");
  await page.getByRole("checkbox", { name: /Terms of Service/ }).click();
  await page.getByRole("checkbox", { name: /health and fitness data/ }).click();
  await agree.click();

  await expect(page.getByText("Meet your race team")).toBeVisible({ timeout: 20000 });
  await snap(page, "welcome");
  await page.getByRole("button", { name: "Get started" }).click();

  await snap(page, "about-you");
  // The name typed at registration is carried over, not asked twice.
  await expect(page.getByLabel("What should we call you?")).toHaveValue("Mira");
  await page.getByRole("radio", { name: "Some races done" }).click();
  await page.getByRole("radio", { name: "4 days a week" }).click();
  await page.getByRole("button", { name: "Because the mountains make me feel alive" }).click();
  await continueStep();

  const start = page.getByRole("button", { name: "Start a Race Mission", exact: true });
  await expect(start).toBeVisible({ timeout: 20000 });
  await snap(page, "empty-home");
  await start.click();

  const day = raceDay();
  await snap(page, "setup-sport");
  await page.getByRole("radio", { name: /Trail & mountain running/ }).click();
  await snap(page, "setup-race");
  await page.getByLabel("Race or challenge name", { exact: true }).fill("First Ridge 30K");
  await page.getByRole("button", { name: day.month, exact: true }).click();
  await page.getByRole("button", { name: day.iso, exact: true }).click();
  await page.getByLabel("Where it starts", { exact: true }).fill("Test Valley");
  await continueStep();
  await snap(page, "setup-demands");
  await page.getByLabel("Distance", { exact: true }).fill("30");
  await page.getByLabel("Elevation gain", { exact: true }).fill("1600");
  await continueStep();
  await snap(page, "setup-goal");
  await continueStep();
  await snap(page, "setup-photo");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await snap(page, "setup-prep");
  // The starting point begins from the About-you answers.
  await expect(page.getByLabel("Training days / week", { exact: true })).toHaveValue("4");
  await page.getByLabel("Hours available / week", { exact: true }).fill("7");
  await continueStep();

  await snap(page, "setup-review");
  await expect(page.getByText("Generate it for me")).toBeVisible();
  await page.getByRole("button", { name: /Commit & build/ }).click();
  await page.getByRole("button", { name: "Open my Race Mission", exact: true }).click({ timeout: 60000 });

  await expect(page.getByRole("heading", { name: "First Ridge 30K" })).toBeVisible();
  await snap(page, "first-mission");
  // The plan exists (the race engine builds it without an AI key) and the brief answers.
  await expect(page.getByText(/days? to the start line/)).toBeVisible();
  await page.goto("/plan");
  await expect(page.getByText(/Week 1/).first()).toBeVisible({ timeout: 20000 });
  await snap(page, "first-plan");
});
