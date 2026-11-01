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
