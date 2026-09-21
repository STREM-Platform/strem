import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { MultiOptionSelect, OptionSelect, type Option } from "@/components/select";
import { Trail, ui } from "@/constants/theme";
import type { Modality, TrainingLevel } from "@/lib/api/types";
import { useOnboardingStep } from "@/lib/use-onboarding-step";

const LEVELS: Option<TrainingLevel>[] = [
  { value: "beginner", label: "Beginner", hint: "New or returning after a long break" },
  { value: "intermediate", label: "Intermediate", hint: "Training consistently for a while" },
  { value: "advanced", label: "Advanced", hint: "Experienced and consistent" },
];

const MODALITIES: Option<Modality>[] = [
  { value: "running", label: "Running" },
  { value: "strength", label: "Trail strength" },
  { value: "mobility", label: "Mobility" },
  { value: "nutrition", label: "Race fueling" },
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
      title="How much trail experience do you have?"
      subtitle="This calibrates how cautiously STREM introduces elevation and technical terrain."
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
        Areas that need the most support (optional)
      </Text>
      <MultiOptionSelect options={MODALITIES} selected={modalities} onToggle={toggle} />
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  helper: {
    ...ui(13, 700),
    color: Trail.textMuted,
  },
});
