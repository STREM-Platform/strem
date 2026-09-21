/** Onboarding screen order and resume helpers (mirrors onboarding-flow.md). */

import type { IconName } from "@/components/ui/icon";
import type { LegacyOnboardingScreen, OnboardingScreen } from "@/lib/api/types";

/** Per-step premium display metadata (emblem + overline), from screen-onboarding.jsx. */
export const ONBOARDING_META: Record<OnboardingScreen, { emblem: IconName; overline: string }> = {
  welcome: { emblem: "mountain", overline: "Welcome" },
  identity: { emblem: "compass", overline: "Identity" },
  "training-background": { emblem: "dumbbell", overline: "Background" },
  commitment: { emblem: "flame", overline: "Commitment" },
  launch: { emblem: "star", overline: "Launch" },
};

export const ONBOARDING_ORDER: OnboardingScreen[] = [
  "welcome",
  "identity",
  "training-background",
  "commitment",
  "launch",
];

const ROUTES: Record<OnboardingScreen, string> = {
  welcome: "/(onboarding)/welcome",
  identity: "/(onboarding)/identity",
  "training-background": "/(onboarding)/training-background",
  commitment: "/(onboarding)/commitment",
  launch: "/(onboarding)/launch",
};

export function routeForScreen(screen: OnboardingScreen): string {
  return ROUTES[screen];
}

/** The screen a user should resume at, given the last screen they completed. */
export function resumeScreen(lastCompleted: OnboardingScreen | LegacyOnboardingScreen | null | undefined): OnboardingScreen {
  if (!lastCompleted) {
    return "welcome";
  }
  if (lastCompleted === "nutrition" || lastCompleted === "tribe") {
    return "launch";
  }
  const index = ONBOARDING_ORDER.indexOf(lastCompleted);
  if (index === -1) {
    return "launch";
  }
  const next = ONBOARDING_ORDER[index + 1];
  return next ?? "launch";
}
