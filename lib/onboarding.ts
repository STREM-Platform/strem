/** Onboarding screen order and resume helpers (mirrors onboarding-flow.md). */

import type { OnboardingScreen } from "@/lib/api/types";

export const ONBOARDING_ORDER: OnboardingScreen[] = [
  "welcome",
  "identity",
  "training-background",
  "commitment",
  "nutrition",
  "tribe",
  "launch",
];

const ROUTES: Record<OnboardingScreen, string> = {
  welcome: "/(onboarding)/welcome",
  identity: "/(onboarding)/identity",
  "training-background": "/(onboarding)/training-background",
  commitment: "/(onboarding)/commitment",
  nutrition: "/(onboarding)/nutrition",
  tribe: "/(onboarding)/tribe",
  launch: "/(onboarding)/launch",
};

export function routeForScreen(screen: OnboardingScreen): string {
  return ROUTES[screen];
}

/** The screen a user should resume at, given the last screen they completed. */
export function resumeScreen(lastCompleted: OnboardingScreen | null | undefined): OnboardingScreen {
  if (!lastCompleted) {
    return "welcome";
  }
  const index = ONBOARDING_ORDER.indexOf(lastCompleted);
  const next = ONBOARDING_ORDER[index + 1];
  return next ?? "launch";
}
