import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const api = "http://localhost:9511/v1";

test.beforeEach(async ({ request, context }, info) => {
  const failures: string[] = [];
  const diagnostics = {
    name: "api-failures",
    contentType: "text/plain",
    body: Buffer.from(""),
  };
  const recordFailure = (message: string) => {
    failures.push(message);
    diagnostics.body = Buffer.from(failures.join("\n"));
  };
  context.on("response", (response) => {
    if (response.url().startsWith(api) && response.status() >= 400)
      recordFailure(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  context.on("requestfailed", (request) => {
    if (request.url().startsWith(api))
      recordFailure(
        `${request.failure()?.errorText} ${new URL(request.url()).pathname}`,
      );
  });
  info.annotations.push({
    type: "fixture",
    description: "Real isolated auth/user/gateway; no API mocks",
  });
  // Retain only statuses/paths, never headers, tokens or personal payloads.
  info.attachments.push(diagnostics);
  // Synthetic account on the test fixture's isolated auth DB. No fake API routes.
  const registration = await request.post(`${api}/auth/register`, {
    data: {
      email: `browser-${randomUUID()}@example.com`,
      password: `Test-${randomUUID()}-only`,
      display_name: "Browser Test",
    },
  });
  expect(registration.status()).toBe(201);
  const { tokens } = await registration.json();
  const headers = { Authorization: `Bearer ${tokens.access_token}` };
  const onboarding = await request.post(`${api}/users/onboarding`, {
    headers,
    data: {
      identity_statement: "Synthetic browser test",
      transformation_goal: "build_endurance",
      training_level: "intermediate",
      weekly_target_days: 3,
      timezone: "Europe/Sofia",
    },
  });
  expect(onboarding.ok()).toBeTruthy();
  const legal = await request.get(`${api}/users/me/legal`, { headers });
  const status = await legal.json();
  const accepted = await request.post(`${api}/users/me/legal/accept`, {
    headers,
    data: {
      acceptances: status.documents.map(
        (doc: { document_type: string; required_version: string }) => ({
          document_type: doc.document_type,
          version: doc.required_version,
        }),
      ),
    },
  });
  expect(accepted.ok()).toBeTruthy();
  await context.addInitScript((pair) => {
    if (!localStorage.getItem("strem.test.initialized")) {
      localStorage.setItem("strem.access_token", pair.access_token);
      localStorage.setItem("strem.refresh_token", pair.refresh_token);
      localStorage.setItem("strem.test.initialized", "true");
    }
  }, tokens);
});

async function createMission(page: Page) {
  await page.goto("/home");
  await page
    .getByRole("button", { name: "Create Race Mission", exact: true })
    .click();
  await page
    .getByLabel("Race name", { exact: true })
    .fill("Browser Test Mountain 30");
  await page
    .getByLabel("Race date (YYYY-MM-DD)", { exact: true })
    .fill("2027-06-12");
  await page
    .getByLabel("Event timezone", { exact: false })
    .fill("Europe/Sofia");
  await page.getByLabel("Location", { exact: true }).fill("Test location");
  await page.getByLabel("Distance (km)", { exact: true }).fill("30");
  await page
    .getByRole("button", { name: "Create my Race Mission", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Browser Test Mountain 30",
      exact: true,
    }),
  ).toBeVisible();
}

test("private GPX upload, course inspection, reload, replacement and coordinated deletion", async ({ page, request }, info) => {
  await createMission(page);
  await page.goto("/race");
  const xml = `<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1"><trk><trkseg><trkpt lat="48" lon="9"><ele>100</ele></trkpt><trkpt lat="48.001" lon="9.001"><ele>110</ele></trkpt><trkpt lat="48.002" lon="9.002"><ele>120</ele></trkpt></trkseg></trk></gpx>`;
  const choose = async (label: string, content: string) => {
    const file = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: label, exact: true }).click();
    await (await file).setFiles({ name: "synthetic-course.gpx", mimeType: "application/gpx+xml", buffer: Buffer.from(content) });
  };
  await choose("Upload GPX / ZIP", xml);
  await expect(page.getByText(/Saved course v1/)).toBeVisible();
  await expect(page.getByText("SECTION 1 / 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next section", exact: true }).click();
  await expect(page.getByText("SECTION 2 / 3", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Saved course v1/)).toBeVisible();
  await page.getByRole("button", { name: "Course source & file controls", exact: true }).click();
  await choose("Replace GPX / ZIP", xml.replace("<ele>120</ele>", "<ele>125</ele>"));
  await expect(page.getByText(/Saved course v2/)).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: info.outputPath("course-explorer.png"), fullPage: true });
  const token = await page.evaluate(() => localStorage.getItem("strem.access_token"));
  const headers = { Authorization: `Bearer ${token}` };
  const exported = await request.get(`${api}/race-missions/data`, { headers });
  expect(exported.ok()).toBeTruthy();
  const data = await exported.json();
  expect(data.courses).toHaveLength(1);
  expect(Buffer.from(data.courses[0].content_base64, "base64").toString()).toContain("<ele>125</ele>");
  await page.goto("/mission-data");
  await page.getByLabel("Deletion confirmation", { exact: true }).fill("DELETE MY RACE MISSIONS");
  await page.getByRole("button", { name: "Permanently delete mission data", exact: true }).click();
  await expect(page.getByText(/saved course files, course models/)).toBeVisible();
  const remaining = await request.get(`${api}/training/courses/data`, { headers });
  expect((await remaining.json()).courses).toHaveLength(0);
});

test("real mission lifecycle, reload, conflict, archive, export and delete", async ({
  page,
  context,
}, info) => {
  await createMission(page);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Browser Test Mountain 30",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Unknown", { exact: true })).toHaveCount(2);
  await expect(
    page.getByText("Preparation is not assessed yet.", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const edit = page.getByRole("button", { name: "Edit race details" });
  await expect(edit).toBeInViewport();
  const editBounds = await edit.boundingBox();
  const navBounds = await page
    .getByRole("tab", { name: "Mission", exact: true })
    .boundingBox();
  expect(editBounds!.y + editBounds!.height).toBeLessThan(navBounds!.y);
  await page.screenshot({
    path: info.outputPath("mission.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();

  await context.setOffline(true);
  await page.getByRole("button", { name: "Refresh saved state" }).click();
  await expect(page.getByRole("alert")).toContainText("could not load");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Retry connection" }).click();
  await expect(
    page.getByRole("button", { name: "Edit race details" }),
  ).toBeVisible();

  const second = await context.newPage();
  await second.goto("/mission-setup");
  await expect(second.getByLabel("Race name", { exact: true })).toHaveValue(
    "Browser Test Mountain 30",
  );
  await expect(
    second.getByRole("heading", { name: "Make the facts yours." }),
  ).toBeVisible();
  await expect(
    second.getByText("Loading saved state…", { exact: true }),
  ).toHaveCount(0);
  await second.evaluate(() => document.fonts.ready);
  await second.screenshot({
    path: info.outputPath("mission-form.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit race details" }).click();
  await page
    .getByLabel("Location", { exact: true })
    .fill("Corrected test location");
  await page
    .getByLabel("Why are you changing these details?")
    .fill("Corrected race location");
  await page.getByRole("button", { name: "Save corrections" }).click();
  await expect(page.getByText(/Corrected test location/)).toBeVisible();
  await second
    .getByLabel("Location", { exact: true })
    .fill("Stale test location");
  await second
    .getByLabel("Why are you changing these details?")
    .fill("Stale test change");
  await second.getByRole("button", { name: "Save corrections" }).click();
  await expect(second.getByRole("alert")).toContainText("This mission changed");
  await expect(second.getByLabel("Location", { exact: true })).toHaveValue(
    "Stale test location",
  );
  await second.close();

  await page
    .getByRole("button", { name: "Archive mission", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm archive" }).click();
  await expect(
    page.getByRole("button", { name: "Create Race Mission", exact: true }),
  ).toBeVisible();
  await createMission(page);
  await page
    .getByRole("button", { name: "Archive mission", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm archive" }).click();
  await expect(
    page.getByRole("button", { name: "Create Race Mission", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mission data & history" }).click();
  await page.getByRole("button", { name: "Load my mission records" }).click();
  await expect(page.getByText(/2 missions · 5 revisions/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const exported = await download;
  expect(exported.suggestedFilename()).toBe("strem-race-missions.json");
  const stream = await exported.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const records = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  expect(records.missions).toHaveLength(2);
  expect(records.revisions).toHaveLength(5);
  await expect(
    page.getByRole("button", { name: "Permanently delete mission data" }),
  ).toBeDisabled();
  await page
    .getByLabel("Deletion confirmation")
    .fill("DELETE MY RACE MISSIONS");
  await page
    .getByRole("button", { name: "Permanently delete mission data" })
    .click();
  await expect(page.getByRole("alert")).toContainText("were deleted");
  await page.getByRole("button", { name: "Load my mission records" }).click();
  await expect(page.getByText(/0 missions · 0 revisions/)).toBeVisible();
});
