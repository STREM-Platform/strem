import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/form";
import { MissionCard } from "@/components/mission-card";
import { EmptyState, MetricCard, Surface } from "@/components/ui/surface";
import { StatusPill } from "@/components/ui/status-pill";
import { SectionHeader, ScreenHeader } from "@/components/ui/typography";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { api } from "@/lib/api/client";
import { useAsync } from "@/lib/use-async";

/**
 * Home / dashboard - the transformation loop made visible.
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
            ? "Your coach needs a bit more from you first. Log an action, then try again."
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
          <ScreenHeader
            overline="Transformation OS"
            title={profile.display_name ? `${profile.display_name}, keep building.` : "Keep building."}
            subtitle="Daily proof, coached missions, and visible progression."
          />

          <Surface variant="raised" style={styles.identityCard}>
            <View style={styles.identityTop}>
              <StatusPill label={profile.rank} tone="inverse" />
              <Text style={styles.xp}>{profile.total_xp.toLocaleString()} XP</Text>
            </View>
            <Text style={styles.identityLabel}>Identity statement</Text>
            <Text style={styles.identityText}>
              {profile.identity_statement || "Define the identity you are building in onboarding."}
            </Text>
          </Surface>

          <View style={styles.metrics}>
            <MetricCard label="Rank" value={profile.rank} detail="Current arc" tone="green" />
            <MetricCard
              label="Active"
              value={String(activeMissions.length)}
              detail="Missions"
            />
          </View>

          <SectionHeader
            title="This week's missions"
            subtitle="Structured commitments from your AI coach."
          />

          {missions.loading && activeMissions.length === 0 ? (
            <Surface variant="muted" style={styles.loadingMissions}>
              <ActivityIndicator color={Colors.accentGreenBright} />
              <Text style={styles.loadingText}>Checking coach missions...</Text>
            </Surface>
          ) : activeMissions.length > 0 ? (
            activeMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onComplete={completeMission}
                onSkip={skipMission}
              />
            ))
          ) : (
            <EmptyState
              title="No active missions yet"
              body="Generate this week's missions to turn your logs into a clear next step."
            >
              {generationNote ? <Text style={styles.note}>{generationNote}</Text> : null}
              <PrimaryButton
                label="Generate missions"
                onPress={onGenerate}
                loading={generating}
              />
            </EmptyState>
          )}

          <Surface variant="outline" style={styles.actionPanel}>
            <Text style={styles.actionTitle}>Next proof</Text>
            <View style={styles.actions}>
              <PrimaryButton
                label="Log an action"
                onPress={() => router.push("/(app)/log")}
                style={styles.actionButton}
              />
              <PrimaryButton
                label="Coach recap"
                onPress={() => router.push("/(app)/coach")}
                variant="secondary"
                style={styles.actionButton}
              />
            </View>
          </Surface>
        </>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  identityCard: {
    borderRadius: Radius.xxl,
  },
  identityTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  xp: {
    color: Colors.accentGreenBright,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
  },
  identityLabel: {
    ...Typography.caption,
    color: Colors.textSubtle,
    textTransform: "uppercase",
  },
  identityText: {
    color: Colors.text,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "800",
  },
  metrics: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  loadingMissions: {
    alignItems: "center",
  },
  loadingText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  note: {
    ...Typography.body,
    color: Colors.accentGreenBright,
  },
  actionPanel: {
    gap: Spacing.md,
  },
  actionTitle: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
