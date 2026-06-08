/* eslint-disable react-hooks/set-state-in-effect -- the initial recap fetch
   legitimately sets state when the request resolves (404 = no recap yet). */

import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { Colors } from "@/constants/Colors";
import { ApiError, SessionExpiredError, api } from "@/lib/api/client";
import type { WeeklyRecap } from "@/lib/api/types";

type Status = "loading" | "recap" | "empty" | "error";

/**
 * Weekly coach recap — an identity-grounded narrative from the AI coach, not a
 * metrics dashboard. Empty until the first weekly recap is generated.
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
        <ActivityIndicator color={Colors.accentGreen} style={{ marginTop: 40 }} />
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
        <Text style={styles.title}>Your coach is listening</Text>
        <Text style={styles.body}>
          Your first weekly recap arrives after a week of training and logging — an honest, personal
          read on the identity you&apos;re building. Keep showing up.
        </Text>
      </AppScreen>
    );
  }

  const week = recap as WeeklyRecap;
  return (
    <AppScreen onRefresh={() => void load()}>
      <Text style={styles.title}>This week</Text>
      <Text style={styles.week}>
        {week.week_start} → {week.week_end}
      </Text>
      <Text style={styles.narrative}>{week.narrative}</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: Colors.text, fontSize: 26, fontWeight: "800" },
  week: { color: Colors.textMuted, fontSize: 13 },
  body: { color: Colors.textMuted, fontSize: 16, lineHeight: 24 },
  narrative: { color: Colors.text, fontSize: 18, lineHeight: 28, marginTop: 8 },
});
