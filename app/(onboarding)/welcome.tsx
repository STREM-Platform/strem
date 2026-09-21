import { useRouter } from "expo-router";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { routeForScreen } from "@/lib/onboarding";

/** Screen 1 — framing. Captures no data; a single CTA into the flow. */
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      screen="welcome"
      title="Choose the start line."
      subtitle="STREM turns one trail race into a complete preparation mission: training, terrain, fueling, gear and race-day decisions."
      primaryLabel="Build my mission"
      onPrimary={() => router.push(routeForScreen("identity"))}
    />
  );
}
