import { useState } from "react";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { OptionSelect, type Option } from "@/components/select";
import type { NutritionPreference } from "@/lib/api/types";
import { useOnboardingStep } from "@/lib/use-onboarding-step";

const PREFERENCES: Option<NutritionPreference>[] = [
  { value: "general_consistency", label: "General consistency" },
  { value: "high_protein", label: "High protein" },
  { value: "plant_based", label: "Plant-based" },
  { value: "no_focus", label: "No nutrition focus right now" },
];

const DEFAULT_PREFERENCE: NutritionPreference = "general_consistency";

/** Screen 5 — nutrition preference. Optional; defaults to general_consistency. */
export default function NutritionScreen() {
  const { submit, submitting, error } = useOnboardingStep("nutrition");
  const [preference, setPreference] = useState<NutritionPreference>(DEFAULT_PREFERENCE);

  return (
    <OnboardingScaffold
      screen="nutrition"
      title="How's nutrition going to fit?"
      subtitle="Consistency-first — no calorie counting required."
      primaryLabel="Continue"
      onPrimary={() => void submit({ nutrition_preference: preference })}
      onSkip={() => void submit({ nutrition_preference: DEFAULT_PREFERENCE })}
      submitting={submitting}
      errorText={error}
    >
      <OptionSelect options={PREFERENCES} selected={preference} onSelect={setPreference} />
    </OnboardingScaffold>
  );
}
