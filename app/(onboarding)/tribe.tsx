import { useState } from "react";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { OptionSelect, type Option } from "@/components/select";
import type { TribePreference } from "@/lib/api/types";
import { useOnboardingStep } from "@/lib/use-onboarding-step";

const PREFERENCES: Option<TribePreference>[] = [
  { value: "join_now", label: "Join a tribe now", hint: "Accountability from day one" },
  { value: "join_later", label: "Maybe later", hint: "We'll keep it handy" },
  { value: "solo_for_now", label: "Solo for now", hint: "Just me for the first week" },
];

const DEFAULT_PREFERENCE: TribePreference = "join_later";

/** Screen 6 — tribe preference. Optional; defaults to join_later. */
export default function TribeScreen() {
  const { submit, submitting, error } = useOnboardingStep("tribe");
  const [preference, setPreference] = useState<TribePreference>(DEFAULT_PREFERENCE);

  return (
    <OnboardingScaffold
      screen="tribe"
      title="Train with a tribe?"
      subtitle="Small accountability groups — never a feed. You're never forced to join."
      primaryLabel="Continue"
      onPrimary={() => void submit({ tribe_preference: preference })}
      onSkip={() => void submit({ tribe_preference: DEFAULT_PREFERENCE })}
      submitting={submitting}
      errorText={error}
    >
      <OptionSelect options={PREFERENCES} selected={preference} onSelect={setPreference} />
    </OnboardingScaffold>
  );
}
