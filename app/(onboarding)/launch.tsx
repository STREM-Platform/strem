/**
 * Screen 7 — launch. Confirms the display name, completes onboarding, then plays
 * the "Initiate" rank-unlock celebration before the route guard moves the user
 * into the app (the celebration moment from screen-onboarding.jsx).
 */

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TextField } from "@/components/form";
import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { Celebration, type CelebrationData } from "@/components/ui/celebration";
import { MountainMark } from "@/components/ui/icon";
import { Panel } from "@/components/ui/primitives";
import { T, disp, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/session/auth-context";

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const INITIATE_CELEBRATION: CelebrationData = {
  kind: "rank",
  title: "Initiate",
  line: "The climb begins. Your first proof unlocks the system.",
};

export default function LaunchScreen() {
  const { user, refreshOnboardingStatus } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [celebrating, setCelebrating] = useState(false);
  const timezone = deviceTimezone();

  const onPrimary = async (): Promise<void> => {
    setSubmitting(true);
    setError(undefined);
    try {
      await api.submitOnboarding({ display_name: displayName.trim() || undefined, timezone, screen: "launch" });
      setCelebrating(true); // celebrate, then refresh on dismiss → guard enters the app
    } catch {
      setError("We couldn't save that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <OnboardingScaffold
        screen="launch"
        title="Initiate."
        subtitle="Confirm your name and we'll begin. Your climb starts at rank Initiate — first proof unlocks the system."
        primaryLabel="Initiate — enter STREM"
        onPrimary={() => void onPrimary()}
        submitting={submitting}
        errorText={error}
      >
        <TextField
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Alex"
          autoCapitalize="words"
          maxLength={40}
        />
        <Text style={styles.timezone}>Timezone: {timezone}</Text>

        <Panel raised accent={T.greenLine} style={styles.rankPanel}>
          <View style={styles.rankRow}>
            <View style={styles.rankMark}>
              <MountainMark size={28} />
            </View>
            <View style={styles.shrink}>
              <Text style={styles.rankLabel}>STARTING RANK</Text>
              <Text style={styles.rankName}>INITIATE</Text>
              <Text style={styles.rankSub}>Every build starts here. Log to climb.</Text>
            </View>
          </View>
        </Panel>
      </OnboardingScaffold>

      <Celebration
        data={celebrating ? INITIATE_CELEBRATION : null}
        onClose={() => void refreshOnboardingStatus()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  timezone: { ...ui(13, 600), color: T.mut },
  shrink: { flexShrink: 1 },
  rankPanel: { marginTop: 8 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  rankMark: {
    width: 50, height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: T.greenSoft, borderWidth: 1, borderColor: T.green,
  },
  rankLabel: { ...mono(10, 700), letterSpacing: 1.2, color: T.green },
  rankName: { ...disp(24, 800), color: T.text },
  rankSub: { ...ui(12, 500), color: T.sub, marginTop: 1 },
});
