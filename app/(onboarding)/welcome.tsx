import { useRouter } from "expo-router";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { routeForScreen } from "@/lib/onboarding";

/** Screen 1 — framing. Captures no data; a single CTA into the flow. */
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <OnboardingScaffold
      screen="welcome"
      title="This is where you change."
      subtitle="The next few questions set the identity your coach builds every week around. It takes about three minutes."
      primaryLabel="Begin"
      onPrimary={() => router.push(routeForScreen("identity"))}
    />
  );
}
