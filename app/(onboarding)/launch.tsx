import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TextField } from "@/components/form";
import { OnboardingScaffold } from "@/components/onboarding-scaffold";
import { Icon } from "@/components/ui/icon";
import { TrailPanel } from "@/components/trail/trail-ui";
import { Trail, disp, mono, ui } from "@/constants/theme";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/session/auth-context";

function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export default function LaunchScreen() {
  const { user, refreshOnboardingStatus } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const timezone = deviceTimezone();

  const onPrimary = async (): Promise<void> => {
    setSubmitting(true);
    setError(undefined);
    try {
      await api.submitOnboarding({ display_name: displayName.trim() || undefined, timezone, screen: "launch" });
      await refreshOnboardingStatus();
    } catch {
      setError("We couldn't save that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OnboardingScaffold
      screen="launch"
      title="Your Race Team is ready."
      subtitle="The next step is the real one: add the trail race that will become your first Race Mission."
      primaryLabel="Enter STREM"
      onPrimary={() => void onPrimary()}
      submitting={submitting}
      errorText={error}
    >
      <TextField
        label="What should the Race Team call you?"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Alex"
        autoCapitalize="words"
        maxLength={40}
      />
      <Text style={styles.timezone}>Timezone: {timezone}</Text>

      <TrailPanel accent>
        <View style={styles.missionRow}>
          <View style={styles.missionMark}>
            <Icon name="flag" size={24} color={Trail.lime} />
          </View>
          <View style={styles.shrink}>
            <Text style={styles.missionLabel}>NEXT</Text>
            <Text style={styles.missionName}>CREATE RACE MISSION</Text>
            <Text style={styles.missionSub}>Event · course · goal · constraints · evidence sources</Text>
          </View>
        </View>
      </TrailPanel>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  timezone: { ...ui(13, 600), color: Trail.textMuted },
  shrink: { flex: 1 },
  missionRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  missionMark: { width: 50, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: Trail.limeSoft, borderWidth: 1, borderColor: Trail.limeLine },
  missionLabel: { ...mono(8, 700), letterSpacing: 1.1, color: Trail.lime },
  missionName: { ...disp(21, 800), color: Trail.text, marginTop: 2 },
  missionSub: { ...ui(10, 500), lineHeight: 15, color: Trail.textMuted, marginTop: 2 },
});
