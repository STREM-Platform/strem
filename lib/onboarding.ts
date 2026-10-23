/** Onboarding order and resume helpers: welcome, then a single "about you" step. */

import type { LegacyOnboardingScreen, OnboardingScreen } from "@/lib/api/types";

export const ONBOARDING_ORDER: OnboardingScreen[] = ["welcome", "identity"];

const ROUTES: Partial<Record<OnboardingScreen, string>> = {
  welcome: "/(onboarding)/welcome",
  identity: "/(onboarding)/identity",
};

export function routeForScreen(screen: OnboardingScreen): string {
  return ROUTES[screen] ?? "/(onboarding)/identity";
}

/** Where to resume: anyone past the welcome (including the retired screens) lands on "about you". */
export function resumeScreen(lastCompleted: OnboardingScreen | LegacyOnboardingScreen | null | undefined): OnboardingScreen {
  return lastCompleted ? "identity" : "welcome";
}
