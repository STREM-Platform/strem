import { useState } from "react";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { OptionSelect, type Option } from "@/components/select";
import { useOnboardingStep } from "@/lib/use-onboarding-step";

// weekly_target_days: integer 2-7, pre-selected at 3 (onboarding-flow.md).
const DAYS: Option<string>[] = [2, 3, 4, 5, 6, 7].map((n) => ({
  value: String(n),
  label: `${n} days a week`,
}));

const DEFAULT_DAYS = 3;

/** Screen 4 — weekly commitment. Pre-filled at 3 for single-tap advance. */
export default function CommitmentScreen() {
  const { submit, submitting, error } = useOnboardingStep("commitment");
  const [days, setDays] = useState<number>(DEFAULT_DAYS);

  return (
    <OnboardingScaffold
      screen="commitment"
      title="What can real life support?"
      subtitle="Choose the number of days you can protect most weeks. STREM adapts around constraints instead of punishing missed sessions."
      primaryLabel="Continue"
      onPrimary={() => void submit({ weekly_target_days: days })}
      submitting={submitting}
      errorText={error}
    >
      <OptionSelect
        options={DAYS}
        selected={String(days)}
        onSelect={(value) => setDays(Number(value))}
      />
    </OnboardingScaffold>
  );
}
