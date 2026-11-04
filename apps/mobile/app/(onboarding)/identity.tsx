import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { Input } from "@/components/ui/fields";
import { Icon, type IconName } from "@/components/ui/icon";
import { Row } from "@/components/ui/kit";
import { C, R, ui } from "@/constants/theme";
import type { TrainingLevel } from "@/lib/api/types";
import { useAuth } from "@/lib/session/auth-context";
import { useOnboardingStep } from "@/lib/use-onboarding-step";

const zone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

const LEVELS: { value: TrainingLevel; icon: IconName; label: string; hint: string }[] = [
  { value: "beginner", icon: "flag", label: "Getting started", hint: "My first big event is ahead" },
  { value: "intermediate", icon: "mountain", label: "Some races done", hint: "I've finished a few" },
  { value: "advanced", icon: "trophy", label: "Experienced", hint: "Many races, chasing better" },
];
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];
const WHYS = ["To find out what I'm capable of", "Because the mountains make me feel alive", "To be strong for the people I love", "To finish what I started last time"];

/** "About you" (redesigned in mobile#142): the few facts every plan needs, plus the athlete's own why. */
export default function AboutYouScreen() {
  const { submit, submitting, error } = useOnboardingStep("identity");
  // The name typed at registration, so it isn't asked twice (#4).
  const { user } = useAuth();
  const [name, setName] = useState(user?.display_name ?? "");
  const [level, setLevel] = useState<TrainingLevel | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const [why, setWhy] = useState("");
  const ready = Boolean(level && days && why.trim().length >= 3);
  const first = name.trim().split(/\s+/)[0];
  return (
    <OnboardingScaffold
      screen="identity"
      title="Let's get to know you"
      subtitle="Three quick things so your race team can plan from day one. Change them anytime."
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
          weekly_target_days: days,
          timezone: zone,
        })
      }
    >
      <Input label="What should we call you?" value={name} onChangeText={setName} placeholder="First name" autoCapitalize="words" hint="optional" />

      <Section n={1} title="Your endurance experience">
        <View style={styles.levels}>
          {LEVELS.map((l) => {
            const on = level === l.value;
            return (
              <Pressable
                key={l.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={l.label}
                onPress={() => setLevel(l.value)}
                style={({ pressed }) => [styles.level, on && styles.on, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.levelIcon, on && { backgroundColor: C.accent }]}>
                  <Icon name={l.icon} size={18} color={on ? C.accentInk : C.text} />
                </View>
                <Text style={[ui(15, 700), { color: C.text }]}>{l.label}</Text>
                <Text style={[ui(12.5, 500), { color: C.textMuted, lineHeight: 18 }]}>{l.hint}</Text>
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section n={2} title="Days a week you can usually train" aside={days ? `${days} days` : undefined}>
        <Row gap={8}>
          {WEEK.map((d, i) => {
            const count = i + 1;
            const on = days != null && count <= days;
            return (
              <Pressable
                key={i}
                accessibilityRole="radio"
                accessibilityState={{ selected: days === count, disabled: count < 2 }}
                accessibilityLabel={`${count} days a week`}
                disabled={count < 2}
                onPress={() => setDays(count)}
                style={({ pressed }) => [styles.day, on && styles.dayOn, count < 2 && !on && { opacity: 0.4 }, pressed && { opacity: 0.8 }]}
              >
                <Text style={[ui(14, 800), { color: on ? C.accentInk : C.textMuted }]}>{d}</Text>
              </Pressable>
            );
          })}
        </Row>
        <Text style={[ui(12.5, 500), { color: C.textDim }]}>
          {days ? (days <= 3 ? "Enough for a strong finish when every session counts." : days >= 6 ? "Plenty — your coach will guard the easy days." : "A solid rhythm for most races.") : "Tap how many days fit a normal week. Which days comes later."}
        </Text>
      </Section>

      <Section n={3} title="Why do you take on hard races?">
        <Row gap={8} wrap>
          {WHYS.map((w) => (
            <Pressable key={w} accessibilityRole="button" onPress={() => setWhy(w)} style={({ pressed }) => [styles.prompt, why === w && styles.on, pressed && { opacity: 0.8 }]}>
              <Text style={[ui(13, 600), { color: C.text }]}>{w}</Text>
            </Pressable>
          ))}
        </Row>
        <Input label="In your own words" value={why} onChangeText={setWhy} multiline maxLength={280} placeholder="Your race team will remind you of this when it gets hard." hint={`${why.length}/280`} />
      </Section>

      {ready ? (
        <View style={styles.preview}>
          <Row gap={8}>
            <Icon name="sparkles" size={15} color={C.accent} />
            <Text style={[ui(12, 700), { color: C.accent }]}>Your race team, at kilometre 30</Text>
          </Row>
          <Text style={[ui(15, 500), { color: C.text, lineHeight: 22 }]}>
            “{first ? `${first}, remember` : "Remember"} why you&rsquo;re here: {lowerFirst(why.trim().replace(/[.!]$/, ""))}. Eat now, hold this pace.”
          </Text>
        </View>
      ) : null}
    </OnboardingScaffold>
  );
}

function lowerFirst(text: string): string {
  return /^I/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

function Section({ n, title, aside, children }: { n: number; title: string; aside?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Row gap={10}>
        <View style={styles.n}>
          <Text style={[ui(12, 800), { color: C.text }]}>{n}</Text>
        </View>
        <Text style={[ui(15, 700), { color: C.text, flex: 1 }]}>{title}</Text>
        {aside ? <Text style={[ui(13, 700), { color: C.accent }]}>{aside}</Text> : null}
      </Row>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, padding: 16, borderRadius: R.lg, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line },
  n: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.surface3 },
  levels: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  level: { flexGrow: 1, flexBasis: 150, gap: 4, padding: 14, borderRadius: R.md, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  levelIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.surface3, marginBottom: 6 },
  on: { borderColor: C.accent, backgroundColor: "rgba(74,222,128,0.07)" },
  day: { flex: 1, maxWidth: 52, aspectRatio: 1, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  dayOn: { backgroundColor: C.accent, borderColor: C.accent },
  prompt: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  preview: { gap: 8, padding: 16, borderRadius: R.lg, backgroundColor: C.surface, borderWidth: 1, borderColor: C.accentLine },
});
