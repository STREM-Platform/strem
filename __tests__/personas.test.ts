/**
 * The Crew persona layer (#73 slice 1) — pure-logic contract tests.
 * One agent, four identity marks: ids/colors must stay distinct, every icon
 * must exist in the shipped PATHS set, and surface ownership must route to the
 * persona the design assigns.
 */

import { describe, expect, it, jest } from "@jest/globals";

// constants/theme imports the expo-google-fonts packages (ESM/native); the
// plain-logic jest env only needs PATHS, so stub the font modules out.
jest.mock("@expo-google-fonts/saira-condensed", () => ({}));
jest.mock("@expo-google-fonts/saira", () => ({}));
jest.mock("@expo-google-fonts/jetbrains-mono", () => ({}));

import { PATHS } from "@/constants/theme";
import { CREW, PERSONAS, personaFor } from "@/lib/agent/personas";

describe("the crew", () => {
  it("has the four personas in presentation order", () => {
    expect(CREW.map((p) => p.id)).toEqual(["forge", "luna", "atlas", "sage"]);
  });

  it("uses distinct identity colors and shipped icons", () => {
    const colors = CREW.map((p) => p.color);
    expect(new Set(colors).size).toBe(CREW.length);
    for (const p of CREW) {
      expect(PATHS[p.icon]).toBeDefined();
      expect(p.soft).toContain("rgba");
      expect(p.line).toContain("rgba");
    }
  });

  it("keys the record by persona id", () => {
    for (const [id, p] of Object.entries(PERSONAS)) {
      expect(p.id).toBe(id);
    }
  });

  it("routes each surface to its owner", () => {
    expect(personaFor("climb").id).toBe("forge");
    expect(personaFor("plan").id).toBe("forge");
    expect(personaFor("nudge").id).toBe("luna");
    expect(personaFor("checkin").id).toBe("luna");
    expect(personaFor("readiness").id).toBe("luna");
    expect(personaFor("insight").id).toBe("atlas");
    expect(personaFor("debrief").id).toBe("atlas");
    expect(personaFor("fuel").id).toBe("sage");
  });
});
