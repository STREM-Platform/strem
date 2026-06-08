import { useState } from "react";

import { TextField } from "@/components/form";
import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { OptionSelect, type Option } from "@/components/select";
import type { TransformationGoal } from "@/lib/api/types";
import { useOnboardingStep } from "@/lib/use-onboarding-step";

const GOALS: Option<TransformationGoal>[] = [
  { value: "build_strength", label: "Build strength" },
  { value: "build_endurance", label: "Build endurance" },
  { value: "hybrid_athlete", label: "Become a hybrid athlete" },
  { value: "lean_and_strong", label: "Lean and strong" },
  { value: "build_discipline", label: "Build discipline" },
  { value: "general_health", label: "General health" },
];

/** Screen 2 — identity. The highest-value screen; both fields are required. */
export default function IdentityScreen() {
  const { submit, submitting, error } = useOnboardingStep("identity");
  const [statement, setStatement] = useState("");
  const [goal, setGoal] = useState<TransformationGoal | undefined>();

  const ready = statement.trim().length > 0 && goal !== undefined;

  return (
    <OnboardingScaffold
      screen="identity"
      title="Who are you becoming?"
      subtitle="One sentence. The coach references this everywhere."
      primaryLabel="Continue"
      onPrimary={() => {
        if (goal) {
          void submit({ identity_statement: statement.trim(), transformation_goal: goal });
        }
      }}
      primaryDisabled={!ready}
      submitting={submitting}
      errorText={error}
    >
      <TextField
        label="I am becoming someone who…"
        value={statement}
        onChangeText={setStatement}
        placeholder="…trains with discipline every week."
        multiline
        maxLength={280}
      />
      <OptionSelect options={GOALS} selected={goal} onSelect={setGoal} />
    </OnboardingScaffold>
  );
}
