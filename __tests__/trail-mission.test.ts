import { describe, expect, it } from "@jest/globals";

import { resumeScreen } from "@/lib/onboarding";

describe("trail Race Mission foundation", () => {
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
