/* eslint-disable react-hooks/set-state-in-effect -- initial recap fetch sets state from the request result. */

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/form";
import { EmptyState, MetricCard, Surface } from "@/components/ui/surface";
import { StatusPill } from "@/components/ui/status-pill";
import { ScreenHeader, SectionHeader } from "@/components/ui/typography";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import { ApiError, SessionExpiredError, api } from "@/lib/api/client";
import type { Mission, MissionState, WeeklyRecap } from "@/lib/api/types";
import { formatDateRange, titleizeEnum } from "@/lib/format";
import { useAsync } from "@/lib/use-async";

type Status = "loading" | "recap" | "empty" | "error";

const MISSION_TONE: Record<MissionState, "green" | "neutral" | "red"> = {
  completed: "green",
  active: "neutral",
  skipped: "neutral",
  expired: "red",
};

interface WeekProof {
  trainingThisWeek: number;
  nutritionThisWeek: number;
}

function weekStart(): Date {
  const date = new Date();
  const mondayOffset = (date.getDay() + 6) % 7; // 0 = Monday
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - mondayOffset);
  return date;
}

async function loadWeekProof(): Promise<WeekProof> {
  const [training, nutrition] = await Promise.all([
    api.listTrainingSessions(50),
    api.listNutritionDays(14),
  ]);
  const start = weekStart();
  return {
    trainingThisWeek: training.items.filter((s) => new Date(s.logged_at) >= start).length,
    nutritionThisWeek: nutrition.items.filter(
      (d) => d.targets_met && new Date(`${d.date}T00:00:00`) >= start,
    ).length,
  };
}

/**
 * Coach - the weekly narrative recap, plus the concrete proof behind it: this
 * week's consistency and the recent mission history.
 */
export default function CoachScreen() {
  const [status, setStatus] = useState<Status>("loading");
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationNote, setGenerationNote] = useState<string | undefined>();

  const proof = useAsync(loadWeekProof);
  const history = useAsync(() => api.listMissionHistory(8));

  const load = useCallback(async (): Promise<void> => {
    try {
      const latest = await api.getLatestRecap();
      setRecap(latest);
      setStatus("recap");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus("empty");
      } else if (!(err instanceof SessionExpiredError)) {
        setStatus("error");
      }
    }
  }, []);

  const onGenerate = useCallback(async (): Promise<void> => {
    setGenerating(true);
    setGenerationNote(undefined);
    try {
      const created = await api.generateRecap();
      setRecap(created);
      setStatus("recap");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setGenerationNote("Log an action first — your coach needs a little more to work with.");
      } else if (!(err instanceof SessionExpiredError)) {
        setGenerationNote("Couldn't reach your coach. Please try again.");
      }
    } finally {
      setGenerating(false);
    }
  }, []);

  const refresh = (): void => {
    void load();
    proof.reload();
    history.reload();
  };

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return (
      <AppScreen>
        <Surface variant="muted" style={styles.loading}>
          <ActivityIndicator color={Colors.accentGreenBright} />
          <Text style={styles.loadingText}>Loading coach...</Text>
        </Surface>
      </AppScreen>
    );
  }
  if (status === "error") {
    return <AppScreen error="Couldn't load your coach. Pull to retry." onRefresh={refresh} />;
  }

  const pastMissions = (history.data?.items ?? []).filter((m) => m.state !== "active");

  return (
    <AppScreen onRefresh={refresh}>
      <ScreenHeader title="This week" subtitle="An honest read on the identity you are building." />

      {status === "recap" && recap ? (
        <Surface variant="raised" style={styles.recap}>
          <View style={styles.recapTop}>
            <StatusPill label="Weekly recap" tone="green" />
            <Text style={styles.week}>{formatDateRange(recap.week_start, recap.week_end)}</Text>
          </View>
          <Text style={styles.narrative}>{recap.narrative}</Text>
        </Surface>
      ) : (
        <EmptyState
          title="Your coach is listening"
          body="Generate this week's recap to turn your logs into an honest, identity-grounded read."
        >
          {generationNote ? <Text style={styles.note}>{generationNote}</Text> : null}
          <PrimaryButton label="Generate this week's recap" onPress={onGenerate} loading={generating} />
        </EmptyState>
      )}

      <SectionHeader title="Proof this week" subtitle="The work behind the words." />
      <View style={styles.metrics}>
        <MetricCard
          label="Training"
          value={String(proof.data?.trainingThisWeek ?? 0)}
          detail="Sessions"
          tone="green"
        />
        <MetricCard
          label="Nutrition"
          value={String(proof.data?.nutritionThisWeek ?? 0)}
          detail="Days on target"
        />
      </View>

      <SectionHeader title="Recent missions" subtitle="Commitments you've closed out." />
      {pastMissions.length === 0 ? (
        <EmptyState
          title="No mission history yet"
          body="Complete a mission and it shows here as permanent proof."
        />
      ) : (
        <View style={styles.missionList}>
          {pastMissions.map((mission: Mission) => (
            <Surface key={mission.id} variant="muted" style={styles.missionRow}>
              <View style={styles.missionCopy}>
                <Text style={styles.missionTitle}>{mission.title}</Text>
                <Text style={styles.missionMeta}>
                  {titleizeEnum(mission.state)} · +{mission.xp_reward} XP
                </Text>
              </View>
              <StatusPill label={titleizeEnum(mission.state)} tone={MISSION_TONE[mission.state]} />
            </Surface>
          ))}
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    paddingVertical: Spacing.xxxl,
  },
  loadingText: {
    ...Typography.label,
    color: Colors.textMuted,
  },
  note: {
    ...Typography.body,
    color: Colors.accentGreenBright,
  },
  recap: {
    gap: Spacing.xl,
  },
  recapTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  week: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: "700",
  },
  narrative: {
    color: Colors.text,
    fontSize: 19,
    lineHeight: 30,
    fontWeight: "700",
  },
  metrics: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  missionList: {
    gap: Spacing.sm,
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  missionCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  missionTitle: {
    color: Colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  missionMeta: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: "600",
  },
});
