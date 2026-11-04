import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";

const api = process.env.STREM_LOGIN_TEST_API ?? "http://localhost:9511/v1";

test("login form reaches the configured API and restores the session after reload", async ({ page, request }) => {
  const credentials = { email: `login-${randomUUID()}@example.com`, password: `Test-${randomUUID()}-only` };
  const registration = await request.post(`${api}/auth/register`, { data: { ...credentials, display_name: "Login Test" } });
  expect(registration.status()).toBe(201);
  const { tokens } = await registration.json();
  const headers = { Authorization: `Bearer ${tokens.access_token}` };
  expect((await request.post(`${api}/users/onboarding`, { headers, data: {
    display_name: "Login Test", identity_statement: "Synthetic login regression", transformation_goal: "build_endurance",
    training_level: "intermediate", weekly_target_days: 3, timezone: "Europe/Berlin", screen: "identity",
  } })).ok()).toBeTruthy();
  const legal = await (await request.get(`${api}/users/me/legal`, { headers })).json();
  expect((await request.post(`${api}/users/me/legal/accept`, { headers, data: {
    acceptances: legal.documents.map((doc: { document_type: string; required_version: string }) => ({ document_type: doc.document_type, version: doc.required_version })),
  } })).ok()).toBeTruthy();

  // No token injection: exercise the form, client URL, CORS and session storage.
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  const response = page.waitForResponse(result => result.url() === `${api}/auth/login` && result.request().method() === "POST");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("button", { name: "Start a Race Mission", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Start a Race Mission", exact: true })).toBeVisible();
});

test("a brand-new account agrees to the policies and moves on", async ({ page, request }) => {
  const registration = await request.post(`${api}/auth/register`, {
    data: { email: `legal-${Date.now()}@example.com`, password: "Fresh-Account-123456", display_name: "Fresh" },
  });
  expect(registration.status()).toBe(201);
  const { tokens } = await registration.json();
  await page.addInitScript((pair) => {
    localStorage.setItem("strem.access_token", pair.access_token);
    localStorage.setItem("strem.refresh_token", pair.refresh_token);
  }, tokens);
  await page.goto("/");
  const agree = page.getByRole("button", { name: /I agree/ });
  await expect(agree).toBeDisabled();
  await page.getByRole("checkbox", { name: /Terms of Service/ }).click();
  await expect(agree).toBeDisabled();
  await page.getByRole("checkbox", { name: /health and fitness data/ }).click();
  await agree.click();
  await expect(page).not.toHaveURL(/\/accept/, { timeout: 15000 });
  const legal = await (await request.get(`${api}/users/me/legal`, { headers: { Authorization: `Bearer ${tokens.access_token}` } })).json();
  expect(legal.needs_acceptance).toBe(false);
});

test("a new athlete goes from the welcome hero through About you into the app", async ({ page, request }) => {
  const registration = await request.post(`${api}/auth/register`, {
    data: { email: `welcome-${randomUUID()}@example.com`, password: `Test-${randomUUID()}-only`, display_name: "Fresh" },
  });
  const { tokens } = await registration.json();
  const headers = { Authorization: `Bearer ${tokens.access_token}` };
  const legal = await (await request.get(`${api}/users/me/legal`, { headers })).json();
  await request.post(`${api}/users/me/legal/accept`, { headers, data: {
    acceptances: legal.documents.map((doc: { document_type: string; required_version: string }) => ({ document_type: doc.document_type, version: doc.required_version })),
  } });
  await page.addInitScript((pair) => {
    localStorage.setItem("strem.access_token", pair.access_token);
    localStorage.setItem("strem.refresh_token", pair.refresh_token);
  }, tokens);
  await page.goto("/");
  await expect(page.getByText("Meet your race team")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Get started" }).click();

  const next = page.getByRole("button", { name: "Continue" });
  await page.getByLabel("What should we call you?").fill("Mira");
  await page.getByRole("radio", { name: "Some races done" }).click();
  await page.getByRole("radio", { name: "4 days a week" }).click();
  await expect(next).toBeDisabled();
  await page.getByRole("button", { name: "Because the mountains make me feel alive" }).click();
  await expect(page.getByText("Mira, remember why you’re here: because the mountains make me feel alive.", { exact: false })).toBeVisible();
  await next.click();
  await expect(page).not.toHaveURL(/onboarding|identity|welcome/, { timeout: 15000 });
  const profile = await (await request.get(`${api}/users/me`, { headers })).json();
  expect(profile).toMatchObject({ display_name: "Mira" });
});

test("delete my account erases every service's data and frees the email", async ({ page, request }) => {
  const credentials = { email: `delete-${randomUUID()}@example.com`, password: `Test-${randomUUID()}-only` };
  const { tokens } = await (await request.post(`${api}/auth/register`, { data: { ...credentials, display_name: "Leaving" } })).json();
  const headers = { Authorization: `Bearer ${tokens.access_token}` };
  expect((await request.post(`${api}/users/onboarding`, { headers, data: {
    display_name: "Leaving", identity_statement: "Synthetic deletion", transformation_goal: "build_endurance",
    training_level: "intermediate", weekly_target_days: 3, timezone: "Europe/Berlin", screen: "identity",
  } })).ok()).toBeTruthy();
  const legal = await (await request.get(`${api}/users/me/legal`, { headers })).json();
  expect((await request.post(`${api}/users/me/legal/accept`, { headers, data: {
    acceptances: legal.documents.map((doc: { document_type: string; required_version: string }) => ({ document_type: doc.document_type, version: doc.required_version })),
  } })).ok()).toBeTruthy();
  expect((await request.post(`${api}/training/sessions`, { headers, data: { session_type: "running", duration_minutes: 30 } })).status()).toBe(201);

  await page.addInitScript((pair) => {
    localStorage.setItem("strem.access_token", pair.access_token);
    localStorage.setItem("strem.refresh_token", pair.refresh_token);
  }, tokens);
  await page.goto("/mission-data");
  await page.getByLabel("Your password", { exact: true }).fill("wrong-password-1");
  await page.getByLabel("Type DELETE MY ACCOUNT to confirm").fill("DELETE MY ACCOUNT");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByText("The password is incorrect. Nothing was deleted.")).toBeVisible();

  await page.getByLabel("Your password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 20000 });
  expect((await request.post(`${api}/auth/login`, { data: credentials })).status()).toBe(401);
  const again = await request.post(`${api}/auth/register`, { data: { ...credentials, display_name: "Back" } });
  expect(again.status()).toBe(201);
  const fresh = { Authorization: `Bearer ${(await again.json()).tokens.access_token}` };
  expect((await (await request.get(`${api}/training/sessions`, { headers: fresh })).json()).items).toEqual([]);
});

test("a reload while STREM is unreachable keeps the session and retries into the app (#2)", async ({ page, request }) => {
  const credentials = { email: `restore-${randomUUID()}@example.com`, password: `Test-${randomUUID()}-only` };
  const registration = await request.post(`${api}/auth/register`, { data: { ...credentials, display_name: "Restore Test" } });
  const { tokens } = await registration.json();
  const headers = { Authorization: `Bearer ${tokens.access_token}` };
  expect((await request.post(`${api}/users/onboarding`, { headers, data: {
    display_name: "Restore Test", identity_statement: "Synthetic restore regression", transformation_goal: "build_endurance",
    training_level: "intermediate", weekly_target_days: 3, timezone: "Europe/Berlin", screen: "identity",
  } })).ok()).toBeTruthy();
  const legal = await (await request.get(`${api}/users/me/legal`, { headers })).json();
  expect((await request.post(`${api}/users/me/legal/accept`, { headers, data: {
    acceptances: legal.documents.map((doc: { document_type: string; required_version: string }) => ({ document_type: doc.document_type, version: doc.required_version })),
  } })).ok()).toBeTruthy();

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  const home = page.getByRole("button", { name: "Start a Race Mission", exact: true });
  await expect(home).toBeVisible();

  // The onboarding check fails at the network level: no login form, no app, tokens kept.
  await page.route("**/users/onboarding/status", (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(page.getByText("Can’t reach STREM")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("strem.refresh_token"))).toBeTruthy();

  await page.unroute("**/users/onboarding/status");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(home).toBeVisible();
  await expect(page.getByText("Can’t reach STREM")).toHaveCount(0);
});
