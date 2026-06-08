import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/form";
import { MissionCard } from "@/components/mission-card";
import { Colors } from "@/constants/Colors";
import { api } from "@/lib/api/client";
import { useAsync } from "@/lib/use-async";

/**
 * Home / dashboard — the transformation loop made visible. Greets the user by
 * their identity statement, shows rank + XP, surfaces this week's AI missions
 * (complete / skip / generate), and links to logging, the tribe, and the coach.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { data: profile, loading, error, reload } = useAsync(() => api.getUserProfile());
  const missions = useAsync(() => api.getActiveMissions());
  const [generating, setGenerating] = useState(false);
  const [generationNote, setGenerationNote] = useState<string | undefined>();

  const refreshProgress = (): void => {
    reload();
    missions.reload();
  };

  const onGenerate = async (): Promise<void> => {
    setGenerating(true);
    setGenerationNote(undefined);
    try {
      const result = await api.generateMissions();
      if (result.generated_count === 0) {
        setGenerationNote(
          result.reason === "insufficient_context"
            ? "Your coach needs a bit more from you first — log an action, then try again."
            : "This week's missions are already set.",
        );
      }
      missions.reload();
    } catch {
      setGenerationNote("Couldn't reach your coach. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const completeMission = async (id: string): Promise<void> => {
    await api.completeMission(id);
    refreshProgress();
  };
  const skipMission = async (id: string): Promise<void> => {
    await api.skipMission(id);
    missions.reload();
  };

  const activeMissions = missions.data?.items ?? [];

  return (
    <AppScreen loading={loading} error={error} onRefresh={refreshProgress}>
      {profile ? (
        <>
          <View style={styles.header}>
            <Text style={styles.rankBadge}>{profile.rank}</Text>
            <Text style={styles.xp}>{profile.total_xp.toLocaleString()} XP</Text>
          </View>

          <Text style={styles.greeting}>
            {profile.display_name ? `${profile.display_name},` : "You,"}
          </Text>
          {profile.identity_statement ? (
            <Text style={styles.identity}>{profile.identity_statement}</Text>
          ) : null}

          <Text style={styles.sectionTitle}>This week&apos;s missions</Text>
          {activeMissions.length > 0 ? (
            activeMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={completeMission}
                onSkip={skipMission}
              />
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardBody}>
                No active missions yet. Generate this week&apos;s missions to get a clear, coached
                next step.
              </Text>
              {generationNote ? <Text style={styles.note}>{generationNote}</Text> : null}
              <PrimaryButton
                label="Generate this week's missions"
                onPress={onGenerate}
                loading={generating}
              />
            </View>
          )}

          <PrimaryButton label="Log an action" onPress={() => router.push("/(app)/log")} />
          <PrimaryButton label="Weekly coach recap" onPress={() => router.push("/(app)/coach")} />
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rankBadge: {
    color: Colors.background,
    backgroundColor: Colors.accentGreen,
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  xp: { color: Colors.textMuted, fontSize: 14, fontWeight: "600" },
  greeting: { color: Colors.text, fontSize: 28, fontWeight: "800", marginTop: 8 },
  identity: { color: Colors.textMuted, fontSize: 16, lineHeight: 24 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: "700", marginTop: 8 },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardBody: { color: Colors.textMuted, fontSize: 14, lineHeight: 20 },
  note: { color: Colors.accentGreen, fontSize: 13 },
});
