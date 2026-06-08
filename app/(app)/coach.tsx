/* eslint-disable react-hooks/set-state-in-effect -- initial recap fetch sets state from the request result. */

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { EmptyState, Surface } from "@/components/ui/surface";
import { StatusPill } from "@/components/ui/status-pill";
import { ScreenHeader } from "@/components/ui/typography";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { ApiError, SessionExpiredError, api } from "@/lib/api/client";
import type { WeeklyRecap } from "@/lib/api/types";
import { formatDateRange } from "@/lib/format";

type Status = "loading" | "recap" | "empty" | "error";

/**
 * Weekly coach recap - identity-grounded narrative, not a metrics dashboard.
 */
export default function CoachScreen() {
  const [status, setStatus] = useState<Status>("loading");
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);

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

  useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return (
      <AppScreen>
        <Surface variant="muted" style={styles.loading}>
          <ActivityIndicator color={Colors.accentGreenBright} />
          <Text style={styles.loadingText}>Loading coach recap...</Text>
        </Surface>
      </AppScreen>
    );
  }
  if (status === "error") {
    return (
      <AppScreen error="Couldn't load your recap. Pull to retry." onRefresh={() => void load()} />
    );
  }
  if (status === "empty") {
    return (
      <AppScreen onRefresh={() => void load()}>
        <ScreenHeader
          title="Coach"
          subtitle="The weekly recap turns your logs into a narrative you can act on."
        />
        <EmptyState
          title="Your coach is listening"
          body="Your first weekly recap arrives after a week of training and logging. Keep showing up."
        />
      </AppScreen>
    );
  }

  const week = recap as WeeklyRecap;
  return (
    <AppScreen onRefresh={() => void load()}>
      <ScreenHeader title="This week" subtitle="An honest read on the identity you are building." />
      <Surface variant="raised" style={styles.recap}>
        <View style={styles.recapTop}>
          <StatusPill label="Weekly recap" tone="green" />
          <Text style={styles.week}>{formatDateRange(week.week_start, week.week_end)}</Text>
        </View>
        <Text style={styles.narrative}>{week.narrative}</Text>
      </Surface>
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
});
