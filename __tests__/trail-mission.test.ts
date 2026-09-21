import { describe, expect, it } from "@jest/globals";

import { resumeScreen } from "@/lib/onboarding";
import { daysUntilRace, TRAIL_MISSION_PREVIEW } from "@/lib/trail/mission-preview";

describe("trail Race Mission foundation", () => {
  it("keeps the product-direction fixture explicitly marked as preview data", () => {
    expect(TRAIL_MISSION_PREVIEW.preview).toBe(true);
  });

  it("counts down to the sample race without returning negative days", () => {
    expect(daysUntilRace(new Date("2026-10-17T07:00:00+03:00"))).toBe(1);
    expect(daysUntilRace(new Date("2026-10-19T07:00:00+03:00"))).toBe(0);
  });

  it("uses only the focused onboarding path", () => {
    expect(resumeScreen(null)).toBe("welcome");
    expect(resumeScreen("welcome")).toBe("identity");
    expect(resumeScreen("commitment")).toBe("launch");
  });

  it("moves accounts from retired onboarding steps directly to launch", () => {
    expect(resumeScreen("nutrition")).toBe("launch");
    expect(resumeScreen("tribe")).toBe("launch");
  });
});
