import { useState } from "react";
import { Text, View } from "react-native";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { Choices, Input } from "@/components/ui/fields";
import { C, ui } from "@/constants/theme";
import type { TrainingLevel } from "@/lib/api/types";
import { useOnboardingStep } from "@/lib/use-onboarding-step";

const zone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

/** "About you": the few facts every plan needs, plus the athlete's own why. */
export default function AboutYouScreen() {
  const { submit, submitting, error } = useOnboardingStep("identity");
  const [name, setName] = useState("");
  const [level, setLevel] = useState<TrainingLevel | null>(null);
  const [days, setDays] = useState<string | null>(null);
  const [why, setWhy] = useState("");
  const ready = Boolean(level && days && why.trim().length >= 3);
  return (
    <OnboardingScaffold
      screen="identity"
      title="A few things about you"
      subtitle="Your race team uses these from day one. You can change them anytime."
      primaryLabel="Continue"
      primaryDisabled={!ready}
      submitting={submitting}
      errorText={error}
      onPrimary={() =>
        level &&
        days &&
        void submit({
          display_name: name.trim() || undefined,
          identity_statement: why.trim(),
          // Legacy required field: STREM is endurance preparation.
          transformation_goal: "build_endurance",
          training_level: level,
          weekly_target_days: Number(days),
          timezone: zone,
        })
      }
    >
      <Input label="What should we call you?" value={name} onChangeText={setName} placeholder="First name" autoCapitalize="words" hint="optional" />
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Your endurance experience</Text>
        <Choices
          options={[
            { value: "beginner", label: "Getting started", hint: "First big event ahead" },
            { value: "intermediate", label: "Some races done", hint: "Finished a few" },
            { value: "advanced", label: "Experienced", hint: "Many races, chasing better" },
          ]}
          value={level}
          onChange={(v) => setLevel(v as TrainingLevel)}
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text style={[ui(13, 700), { color: C.textMuted }]}>Days a week you can usually train</Text>
        <Choices options={["2", "3", "4", "5", "6", "7"].map((d) => ({ value: d, label: d }))} value={days} onChange={setDays} />
      </View>
      <Input label="Why do you take on hard races?" value={why} onChangeText={setWhy} multiline maxLength={280} placeholder="In your own words — your race team will remind you when it gets hard." hint={`${why.length}/280`} />
    </OnboardingScaffold>
  );
}
