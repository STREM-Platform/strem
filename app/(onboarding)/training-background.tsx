import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { MultiOptionSelect, OptionSelect, type Option } from "@/components/select";
import { Colors, Typography } from "@/constants/theme";
import type { Modality, TrainingLevel } from "@/lib/api/types";
import { useOnboardingStep } from "@/lib/use-onboarding-step";

const LEVELS: Option<TrainingLevel>[] = [
  { value: "beginner", label: "Beginner", hint: "New or returning after a long break" },
  { value: "intermediate", label: "Intermediate", hint: "Training consistently for a while" },
  { value: "advanced", label: "Advanced", hint: "Experienced and consistent" },
];

const MODALITIES: Option<Modality>[] = [
  { value: "strength", label: "Strength" },
  { value: "running", label: "Running" },
  { value: "mobility", label: "Mobility" },
  { value: "nutrition", label: "Nutrition" },
];

/** Screen 3 — starting point. `training_level` required; modalities optional. */
export default function TrainingBackgroundScreen() {
  const { submit, submitting, error } = useOnboardingStep("training-background");
  const [level, setLevel] = useState<TrainingLevel | undefined>();
  const [modalities, setModalities] = useState<Modality[]>([]);

  const toggle = (value: Modality): void => {
    setModalities((current) =>
      current.includes(value) ? current.filter((m) => m !== value) : [...current, value],
    );
  };

  return (
    <OnboardingScaffold
      screen="training-background"
      title="Where are you starting from?"
      subtitle="This calibrates your first week so it's never too much."
      primaryLabel="Continue"
      onPrimary={() => {
        if (level) {
          void submit({ training_level: level, preferred_modalities: modalities });
        }
      }}
      primaryDisabled={level === undefined}
      submitting={submitting}
      errorText={error}
    >
      <OptionSelect options={LEVELS} selected={level} onSelect={setLevel} />
      <Text style={styles.helper}>
        Pillars you want to prioritize first (optional)
      </Text>
      <MultiOptionSelect options={MODALITIES} selected={modalities} onToggle={toggle} />
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  helper: {
    ...Typography.label,
    color: Colors.textMuted,
  },
});
